pipeline {
  agent any

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '15'))
  }

  parameters {
    string(name: 'API_BASE_URL', defaultValue: 'http://127.0.0.1:5000', description: 'Backend base URL used at React build time')
  }

  environment {
    DOCKERHUB_CREDENTIALS = 'dockerhub-credentials-id'
    DOCKER_IMAGE_REPO = 'birendramondal/daemon_monitor'
    IMAGE_SHORT_TAG   = 'frontend_v-latest'
    IMAGE_BUILD_TAG   = "frontend_v-${env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build React') {
      environment { REACT_APP_API_BASE_URL = "${params.API_BASE_URL}" }
      steps {
        sh '''
          set -e
          node -v || true
          npm -v || true
          if [ -f package-lock.json ]; then npm ci; else npm install; fi
          export REACT_APP_API_BASE_URL="$REACT_APP_API_BASE_URL"
          npm run build
        '''
      }
    }

    stage('Docker Build') {
      steps {
        sh 'set -e; docker build -t ${DOCKER_IMAGE_REPO}:${IMAGE_BUILD_TAG} -t ${DOCKER_IMAGE_REPO}:${IMAGE_SHORT_TAG} .'
      }
    }

    stage('Docker Push') {
      steps {
        withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CREDENTIALS, usernameVariable: 'U', passwordVariable: 'P')]) {
          sh '''
            set -e
            echo "$P" | docker login -u "$U" --password-stdin
            docker push ${DOCKER_IMAGE_REPO}:${IMAGE_BUILD_TAG}
            docker push ${DOCKER_IMAGE_REPO}:${IMAGE_SHORT_TAG}
          '''
        }
      }
    }
  }

  post {
    always { sh 'docker logout || true' }
  }
}