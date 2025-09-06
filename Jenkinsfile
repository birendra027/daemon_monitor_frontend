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
        // Uses your image for the build. It must have node and npm installed.
        sh '''
          set -e
          docker run --rm \
            -v "$PWD":/app \
            -w /app \
            -e REACT_APP_API_BASE_URL="$REACT_APP_API_BASE_URL" \
            birendramondal/daemon_monitor:frontend_v1.0 sh -lc '
              if ! command -v npm >/dev/null 2>&1; then
                echo "npm not found in birendramondal/daemon_monitor:frontend_v1.0"; exit 1
              fi
              node -v || true
              npm -v || true
              if [ -f package-lock.json ]; then npm ci; else npm install; fi
              npm run build
            '
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