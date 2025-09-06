pipeline {
  agent any
  stages {
    stage('Docker login test') {
      environment { DOCKERHUB_CREDENTIALS = 'dockerhub-credentials-id' }
      steps {
        sh 'docker version'
        withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CREDENTIALS, usernameVariable: 'U', passwordVariable: 'P')]) {
          sh 'echo "$P" | docker login -u "$U" --password-stdin'
        }
      }
    }
  }
  post { always { sh 'docker logout || true' } }
}