FROM eclipse-temurin:21-jdk
RUN apt-get update && apt-get install -y unzip
WORKDIR /app
COPY . /app
RUN unzip -o NexusFlow.zip || true
RUN javac -d bin -cp "lib/*" src/main/Main.java src/model/*.java src/util/*.java src/dao/*.java src/service/*.java src/server/*.java src/ui/*.java
EXPOSE 8080
CMD ["java", "-cp", "bin:lib/*", "main.Main"]
