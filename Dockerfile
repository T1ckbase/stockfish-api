FROM denoland/deno:latest

USER root

EXPOSE 7860

WORKDIR /app

RUN apt-get update && \
    apt-get install -y curl tar ca-certificates --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/official-stockfish/Stockfish/releases/download/sf_17.1/stockfish-ubuntu-x86-64.tar -o /tmp/stockfish.tar && \
    tar -xvf /tmp/stockfish.tar -C /tmp/ && \
    mv /tmp/stockfish/stockfish-ubuntu-x86-64 /app/stockfish-ubuntu-x86-64 && \
    rm -rf /tmp/stockfish /tmp/stockfish.tar

RUN chmod +x /app/stockfish-ubuntu-x86-64

RUN deno install --entrypoint main.ts

COPY . .

# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache main.ts

# CMD ["serve", "-A", "--port", "7860", "serve.ts"]
CMD ["run", "-A", "main.ts"]