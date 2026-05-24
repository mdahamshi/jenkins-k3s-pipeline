pipeline {
    agent any
    environment {
        IMAGE_NAME = 'ghcr.io/mdahamshi/jenkins-k3s-pipeline'
        IMAGE_TAG = "${BUILD_NUMBER}"
        GITHUB_TOKEN = credentials('github-token')
        KUBECONFIG_CREDENTIAL = credentials('k3s-kubeconfig')
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
                    echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
                    docker push $IMAGE_NAME:$IMAGE_TAG
                    docker push $IMAGE_NAME:latest
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    export KUBECONFIG=$KUBECONFIG_CREDENTIAL
                    kubectl set image deployment/jenkins-k3s-app \
                        app=$IMAGE_NAME:$IMAGE_TAG \
                        --kubeconfig=$KUBECONFIG_CREDENTIAL
                    kubectl rollout status deployment/jenkins-k3s-app \
                        --kubeconfig=$KUBECONFIG_CREDENTIAL
                '''
            }
        }

    }
    post {
        always {
            sh 'docker logout ghcr.io'
        }
    }
}