pipeline {
    agent any
    environment {
        IMAGE_NAME = 'ghcr.io/mdahamshi/jenkins-k3s-pipeline'
        IMAGE_TAG = "${BUILD_NUMBER}"
        GITHUB_TOKEN = credentials('github-token')
    }
    stages {
        stage('Build') {
      steps {
        sh '''
                    docker build -t $IMAGE_NAME:$IMAGE_TAG .
                    docker tag $IMAGE_NAME:$IMAGE_TAG $IMAGE_NAME:latest
                '''
      }
        }

        stage('Test') {
      agent {
        docker {
          image 'node:20-alpine'
          reuseNode true
        }
      }
      steps {
        sh '''
                    npm test
                '''
      }
        }

        stage('Push') {
      steps {
        sh '''
                    echo $GITHUB_TOKEN | docker login ghcr.io -u mdahamshi --password-stdin
                    docker push $IMAGE_NAME:$IMAGE_TAG
                    docker push $IMAGE_NAME:latest
                    docker logout ghcr.io
                '''
      }
        }

    stage('Deploy') {
      steps {
        withCredentials([string(credentialsId: 'k3s-kubeconfig', variable: 'KUBECONFIG_CONTENT')]) {
            sh '''
                TMPDIR=$(mktemp -d)
                echo "$KUBECONFIG_CONTENT" > $TMPDIR/config
                chmod 600 $TMPDIR/config

                docker run --rm \
                  --network host \
                  -v $TMPDIR/config:/tmp/kubeconfig:ro \
                  bitnami/kubectl:latest \
                  --kubeconfig=/tmp/kubeconfig \
                  set image deployment/jenkins-k3s-app \
                  app=$IMAGE_NAME:$IMAGE_TAG

                rm -rf $TMPDIR
            '''
        }
      }
    }
    }
    post {
        always {
      sh 'docker logout ghcr.io || true'
        }
    }
}
