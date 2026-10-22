# Repository Guidelines

This is a hriccio AI-assisted repository.

## Repository Role

- Own one focused Python application, library, automation tool, data utility, or experiment.
- Keep the default runtime local and Python-based unless a decision explicitly adds infrastructure.
- Prefer small, testable modules under `src/`.
- Keep packaging metadata explicit in `pyproject.toml` when the repository contains Python code.

## Project Structure & Module Organization

- `src/` owns application and library code.
- `tests/` owns pytest coverage.
- `pyproject.toml` owns packaging, dependency, and pytest configuration.
- `.venv/`, build outputs, caches, and generated artifacts must not be edited or committed.

## Build, Test, And Development Commands

- `python3 -m venv .venv` creates a local virtual environment.
- `. .venv/bin/activate` activates the virtual environment.
- `python -m pip install -e ".[dev]"` installs the package and development dependencies.
- `pytest` runs tests.

## Working Rules

- Keep behavior covered by tests where practical.
- Avoid adding own infrastructure, monitoring, databases, or server runtimes unless the repository purpose requires them.
- Use `hr capability show mcp-usage` for MCP guidance; default allowed MCPs are `aws-docs`, `chrome-devtools`, `codex-usage`, `discord-docs`, `github`, and `openaiDeveloperDocs`.
- Preserve durable project decisions in Markdown when scope changes.
