'use strict'
import chokidar from 'chokidar'

// initial watcher
export default {
	createWatcher: (watchFolder, watchConfig) => {
		const watcher = chokidar.watch(watchFolder, {
		usePolling: watchConfig.usePolling || true,
		interval: watchConfig.interval || 100,
		binaryInterval: watchConfig.binaryInterval || 300,
		persistent: true,
		depth: watchConfig.depth || 0,
		awaitWriteFinish: {
			stabilityThreshold: watchConfig.stabilityThreshold || 5000,
			pollInterval: watchConfig.pollInterval || 1000
		},
	})
	return watcher
	}
}