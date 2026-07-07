FROM oven/bun:1.2

# yt-dlp (declared project repository dependency) + ffmpeg for opus extraction
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl ffmpeg python3 \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
        -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app
COPY . .

EXPOSE 8080
CMD ["bun", "src/index.ts"]
