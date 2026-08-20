# Build stage — Maven multi-module (common-library + product)
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
COPY common-library ./common-library
COPY product ./product
RUN mvn -q -pl product -am package -DskipTests -B

# Run stage
FROM eclipse-temurin:25-jre-alpine
COPY --from=build /app/product/target/product-*.jar app.jar
ENTRYPOINT ["java", "-jar", "/app.jar", "--spring.profiles.active=standalone"]
