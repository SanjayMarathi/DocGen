from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('generator.urls')), # MUST be 'api/'
    # Serve React app at root and for any non-API/admin path (client-side routing)
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
    re_path(r'^(?!admin/|api/).*$', TemplateView.as_view(template_name='index.html')),
]
