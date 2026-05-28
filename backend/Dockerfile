FROM eclipse-temurin:24-jdk-alpine AS builder
WORKDIR /app
RUN apk add --no-cache curl unzip && \
    curl -L https://services.gradle.org/distributions/gradle-8.14-bin.zip -o /tmp/gradle.zip && \
    unzip /tmp/gradle.zip -d /opt && \
    ln -s /opt/gradle-8.14/bin/gradle /usr/local/bin/gradle

# Copy only dependency definition files first to cache dependency resolution layer separately from source changes.
# This layer is only invalidated when build.gradle or settings.gradle changes, not on every source edit.
COPY build.gradle settings.gradle ./
RUN --mount=type=cache,target=/root/.gradle \
    gradle dependencies --no-daemon

# Copy source and build (Gradle cache persists via --mount so deps are not re-downloaded)
COPY . .
RUN --mount=type=cache,target=/root/.gradle \
    gradle bootJar --no-daemon

FROM eclipse-temurin:24-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
