{{/* Generate a fullname using only the release name for DNS-1035 compliance */}}
{{- define "daemon_monitor_frontend.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/* Generate a name for the app using only the release name */}}
{{- define "daemon_monitor_frontend.name" -}}
{{- .Release.Name -}}
{{- end -}}
