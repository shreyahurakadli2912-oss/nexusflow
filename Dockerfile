FROM eclipse-temurin:21-jdk
RUN apt-get update && apt-get install -y unzip
WORKDIR /app
COPY . /app
RUN unzip -o NexusFlow.zip || true
EXPOSE 8080
CMD ["java", "-cp", "nexusflow.jar:lib/*", "main.Main"]
