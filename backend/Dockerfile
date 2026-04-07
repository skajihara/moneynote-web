FROM eclipse-temurin:24-jdk-alpine AS builder
WORKDIR /app
RUN apk add --no-cache curl unzip && \
    curl -L https://services.gradle.org/distributions/gradle-8.14-bin.zip -o /tmp/gradle.zip && \
    unzip /tmp/gradle.zip -d /opt && \
    ln -s /opt/gradle-8.14/bin/gradle /usr/local/bin/gradle
COPY . .
RUN gradle bootJar --no-daemon

FROM eclipse-temurin:24-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
