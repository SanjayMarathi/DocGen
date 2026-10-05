import json
from unittest import mock

from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from . import views
from .models import DocHistory


class FakeOllamaResponse:
    """Stands in for the streaming `requests` response Ollama returns."""

    def __init__(self, tokens, done_reason="stop"):
        self.closed = False
        self._lines = [json.dumps({"response": t, "done": False}).encode() for t in tokens]
        self._lines.append(json.dumps({"response": "", "done": True, "done_reason": done_reason}).encode())

    def raise_for_status(self):
        pass

    def iter_lines(self):
        return iter(self._lines)

    def close(self):
        self.closed = True


class DetectInputTypeTests(SimpleTestCase):
    def test_code_is_detected(self):
        self.assertEqual(views.detect_input_type("def add(a, b):\n    return a + b"), "code")
        self.assertEqual(views.detect_input_type("int main() { return 0; }"), "code")

    def test_problem_is_detected(self):
        self.assertEqual(views.detect_input_type("find the sum of an array"), "problem")

    def test_factual_and_concept(self):
        self.assertEqual(views.detect_input_type("who is the president of India"), "factual")
        self.assertEqual(views.detect_input_type("photosynthesis"), "concept")


class InternetCheckTests(SimpleTestCase):
    def setUp(self):
        views._net_state.update(checked=float("-inf"), ok=False)

    def test_result_is_cached(self):
        with mock.patch.object(views.socket, "create_connection") as conn:
            self.assertTrue(views.internet_available())
            self.assertTrue(views.internet_available())
            self.assertEqual(conn.call_count, 1)

    def test_offline(self):
        with mock.patch.object(views.socket, "create_connection", side_effect=OSError):
            self.assertFalse(views.internet_available())


class PromptTests(SimpleTestCase):
    def test_quick_and_detailed_differ(self):
        quick = views.build_prompt("def f(): pass", "code", "", quick=True)
        detailed = views.build_prompt("def f(): pass", "code", "", quick=False)
        self.assertIn("Be concise", quick)
        self.assertIn("Be thorough", detailed)
        self.assertIn("def f(): pass", quick)

    def test_web_context_forces_verified_data_prompt(self):
        prompt = views.build_prompt("who is x", "factual", "X was born in 1900.", quick=True)
        self.assertIn("VERIFIED DATA", prompt)
        self.assertIn("X was born in 1900.", prompt)


class GenerateViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("tester", password="pw12345!")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        views._net_state.update(checked=float("-inf"), ok=False)

    def _generate(self, body, tokens=("Hello", " world"), done_reason="stop"):
        fake = FakeOllamaResponse(tokens, done_reason)
        with mock.patch.object(views._session, "post", return_value=fake) as post:
            resp = self.client.post("/api/generate/", body, format="json")
            text = b"".join(resp.streaming_content).decode() if resp.status_code == 200 else None
        return resp, text, post, fake

    def test_requires_login(self):
        resp = APIClient().post("/api/generate/", {"code": "x"}, format="json")
        self.assertEqual(resp.status_code, 401)

    def test_empty_input_is_rejected(self):
        resp = self.client.post("/api/generate/", {"code": "   "}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_streams_and_saves_history(self):
        resp, text, _, fake = self._generate({"code": "def add(a, b):\n    return a + b"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(text, "Hello world")
        self.assertEqual(resp["X-Accel-Buffering"], "no")
        entry = DocHistory.objects.get(pk=int(resp["X-Doc-Id"]))
        self.assertEqual(entry.content, "Hello world")
        self.assertTrue(fake.closed, "upstream Ollama connection must always be closed")

    def test_ollama_payload_is_tuned_for_speed(self):
        _, _, post, _ = self._generate({"code": "def add(a, b):\n    return a + b", "mode": "quick"})
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["keep_alive"], views.KEEP_ALIVE)
        self.assertEqual(payload["options"]["num_predict"], views.GEN_OPTIONS["quick"]["num_predict"])
        self.assertEqual(payload["options"]["num_ctx"], views.NUM_CTX)

    def test_detailed_mode_allows_longer_output_with_same_context(self):
        _, _, post, _ = self._generate({"code": "def add(a, b):\n    return a + b", "mode": "detailed"})
        options = post.call_args.kwargs["json"]["options"]
        self.assertGreater(options["num_predict"], views.GEN_OPTIONS["quick"]["num_predict"])
        # A different num_ctx would force Ollama to reload the model between requests.
        self.assertEqual(options["num_ctx"], views.GEN_OPTIONS["quick"]["num_ctx"])

    def test_unknown_model_falls_back_to_default(self):
        _, _, post, _ = self._generate({"code": "def f(): pass\n", "model": "gpt-9000"})
        self.assertEqual(post.call_args.kwargs["json"]["model"], views.DEFAULT_MODEL)

    def test_code_input_never_hits_wikipedia(self):
        with mock.patch.object(views, "fetch_wikipedia") as wiki, \
                mock.patch.object(views, "internet_available", return_value=True):
            self._generate({"code": "def add(a, b):\n    return a + b"})
        wiki.assert_not_called()

    def test_factual_topic_uses_wikipedia_when_online(self):
        with mock.patch.object(views, "fetch_wikipedia", return_value="Fact: 42.") as wiki, \
                mock.patch.object(views, "internet_available", return_value=True):
            resp, _, post, _ = self._generate({"code": "who is the president of India"})
        wiki.assert_called_once()
        self.assertIn("Fact: 42.", post.call_args.kwargs["json"]["prompt"])
        self.assertEqual(resp["X-AI-Warning"], "online")

    def test_wikipedia_skipped_when_offline(self):
        with mock.patch.object(views, "fetch_wikipedia") as wiki, \
                mock.patch.object(views, "internet_available", return_value=False):
            resp, _, _, _ = self._generate({"code": "photosynthesis"})
        wiki.assert_not_called()
        self.assertEqual(resp["X-AI-Warning"], "offline")

    def test_truncated_quick_output_is_flagged(self):
        _, text, _, _ = self._generate({"code": "def f(): pass\n", "mode": "quick"}, done_reason="length")
        self.assertIn("Output trimmed in Quick mode", text)

    def test_model_failure_streams_error_marker_and_saves_nothing(self):
        with mock.patch.object(views._session, "post", side_effect=ConnectionError("down")):
            resp = self.client.post("/api/generate/", {"code": "def f(): pass\n"}, format="json")
            text = b"".join(resp.streaming_content).decode()
        self.assertIn(views.ERROR_TAG, text)
        self.assertEqual(DocHistory.objects.get(pk=int(resp["X-Doc-Id"])).content, "")

    def test_stop_closes_upstream_and_keeps_partial_text(self):
        fake = FakeOllamaResponse(["Part", "ial", " text"])
        with mock.patch.object(views._session, "post", return_value=fake):
            resp = self.client.post("/api/generate/", {"code": "def f(): pass\n"}, format="json")
            stream = iter(resp.streaming_content)
            next(stream)
            next(stream)
            resp.close()  # what the WSGI server does when the browser aborts the request
        self.assertTrue(fake.closed)
        self.assertEqual(DocHistory.objects.get(pk=int(resp["X-Doc-Id"])).content, "Partial")


class WikipediaHelperTests(SimpleTestCase):
    def test_timeout_returns_empty_string_instead_of_blocking(self):
        import time as _time

        def slow(_query):
            _time.sleep(1)
            return "late"

        with mock.patch.object(views, "_wikipedia_lookup", side_effect=slow):
            started = _time.monotonic()
            self.assertEqual(views.fetch_wikipedia("anything", timeout=0.05), "")
            self.assertLess(_time.monotonic() - started, 0.5)

    def test_errors_return_empty_string(self):
        with mock.patch.object(views, "_wikipedia_lookup", side_effect=ConnectionError):
            self.assertEqual(views.fetch_wikipedia("anything"), "")
