{{- define "platform-status-api.name" -}}
{{- .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "platform-status-api.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "platform-status-api.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "platform-status-api.labels" -}}
app.kubernetes.io/name: {{ include "platform-status-api.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
