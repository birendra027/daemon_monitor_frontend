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
  // Jenkins credentials ID with GitHub access (username + token recommended)
  GIT_CREDENTIALS       = 'github-token-use'
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

    stage('Update Helm values.yaml tag and push') {
      steps {
        sh '''
          set -e
          FILE="helm/values.yaml"
          NEW_TAG="${IMAGE_BUILD_TAG}"
          test -f "$FILE" || { echo "Missing $FILE"; exit 1; }
          # Update the 'image.tag:' line
          sed -i -E "s#(^[[:space:]]*tag:[[:space:]]*).*#\\1${NEW_TAG}#g" "$FILE"

          # Commit only if changed
          git config user.email "ci@jenkins"
          git config user.name  "Jenkins CI"
          if git diff --quiet -- "$FILE"; then
            echo "No changes in $FILE (already ${NEW_TAG}).";
            exit 0;
          fi
          git add "$FILE"
          git commit -m "chore(helm): bump frontend image tag to ${NEW_TAG}"
        '''
        withCredentials([usernamePassword(credentialsId: env.GIT_CREDENTIALS, usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
          sh '''
              # Extract branch name (remove "origin/")
              BRANCH=${GIT_BRANCH#origin/}
              echo "Pushing to branch: $BRANCH"
              ORIGIN_URL=$(git config --get remote.origin.url)
              HOST_PATH=${ORIGIN_URL#https://}
              PUSH_URL="https://${GIT_USER}:${GIT_PASS}@${HOST_PATH}"
              git push "$PUSH_URL" HEAD:refs/heads/$BRANCH
    '''
        }
      }
    }
  }

  post {
    always { sh 'docker logout || true' }
  }
}