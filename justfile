server_compose := "lib/server/docker-compose.yml"
webapp_compose := "lib/webapp/docker-compose.yml"

# Start server and webapp
start:
    docker compose -f {{server_compose}} up -d --build
    docker compose -f {{webapp_compose}} up -d --build

# Stop server and webapp
stop:
    docker compose -f {{webapp_compose}} down
    docker compose -f {{server_compose}} down
