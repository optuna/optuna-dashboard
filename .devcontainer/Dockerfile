FROM python:3.12

# Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
RUN apt-get install -y nodejs
RUN npm install -g vsce

# Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install wasm-pack and wasm-opt
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
RUN wget https://github.com/WebAssembly/binaryen/releases/download/version_113/binaryen-version_113-x86_64-linux.tar.gz && \
    tar -zxvf binaryen-version_113-x86_64-linux.tar.gz && \
    mv binaryen-version_113/ /root/.binaryen && \
    rm binaryen-version_113-x86_64-linux.tar.gz
ENV PATH="/root/.binaryen/bin:${PATH}"

RUN apt-get update && apt-get install -y \
    build-essential \
    libssl-dev \
    pkg-config
