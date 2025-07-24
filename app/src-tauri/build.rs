fn main() {
    dotenv_build::output(dotenv_build::Config::default()).unwrap(); // load .env file at compile time
    tauri_build::build()
}
