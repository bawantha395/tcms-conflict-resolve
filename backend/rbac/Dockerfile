# Base PHP image with Apache
FROM php:8.1-apache

# Install PHP extensions
RUN apt-get update && apt-get install -y zip unzip git curl \
    && docker-php-ext-install mysqli pdo pdo_mysql

# Enable Apache modules
RUN a2enmod rewrite
RUN a2enmod headers

# Install Composer from official Composer image
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy composer files and install dependencies
COPY src/composer.json composer.json
RUN composer install

# Copy the rest of your application code (excluding vendor)
COPY ./src /var/www/html

# .dockerignore should include:
# vendor/
# composer.lock (if you don't want to copy it)