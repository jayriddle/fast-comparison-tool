// Stub — single-threaded build does not use a worker thread.
// @ffmpeg/ffmpeg@0.11.6 fetches this path unconditionally; the blob URL is
// passed to locateFile() but never used because no Worker is spawned.
