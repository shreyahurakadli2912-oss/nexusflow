FROM eclipse-temurin:17-jdk
WORKDIR /app
COPY . /app
RUN javac -d bin -cp "lib/*" src/main/Main.java src/model/*.java src/util/*.java src/dao/*.java src/service/*.java src/server/*.java src/ui/*.java
EXPOSE 8080
CMD ["java", "-cp", "bin:lib/*", "main.Main"]
