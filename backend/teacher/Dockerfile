FROM php:8.1-apache

# Install system dependencies including PDFtk (pdftk-java) and FFmpeg
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zip \
    unzip \
    git \
    curl \
    pdftk-java \
    default-jre-headless \
    ffmpeg \
    fonts-dejavu-core \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd mysqli pdo pdo_mysql

# Enable Apache modules
RUN a2enmod rewrite headers

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY src/ .

# Install PHP dependencies via Composer
RUN composer install --no-dev --optimize-autoloader

# Configure PHP for large file uploads (for recordings - 500MB limit)
RUN echo "upload_max_filesize = 500M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 500M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "max_execution_time = 600" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "max_input_time = 600" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 512M" >> /usr/local/etc/php/conf.d/uploads.ini

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Create .htaccess for URL rewriting
RUN echo 'RewriteEngine On' > .htaccess \
    && echo 'RewriteCond %{REQUEST_FILENAME} !-f' >> .htaccess \
    && echo 'RewriteCond %{REQUEST_FILENAME} !-d' >> .htaccess \
    && echo 'RewriteRule ^(.*)$ routes.php [QSA,L]' >> .htaccess

# Expose port 80
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"] 