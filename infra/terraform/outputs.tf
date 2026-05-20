output "namespace" {
  value = kubernetes_namespace.talentiq.metadata[0].name
}
