<template>
  <div class="demo-intro">
    <div class="content">
      <div class="logo-icon">🎮</div>
      <h2>Welcome to OmniPad</h2>
      <p class="subtitle">A high-performance virtual input framework for modern web emulators.</p>

      <ul class="steps">
        <li>
          <span class="step-num">1</span>
          <p>
            <strong>Load Game:</strong> Click the "Import SWF" on the toolbar above to import a
            <code>.swf</code> file and start the Ruffle engine inside the isolated Iframe.
          </p>
        </li>
        <li>
          <span class="step-num">2</span>
          <p>
            <strong>Select Profile:</strong> Click the "Config" on the toolbar to open the
            configuration console which will be displayed on the right, then choose a preset from
            the console to spawn interactive virtual widgets (Joysticks, Buttons, Trackpads).
          </p>
        </li>
      </ul>

      <div class="badge">Cross-Frame IPC & Shadow DOM Penetration Ready</div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

.demo-intro {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at center, #1e1e20 0%, #000 100%);
  color: #fff;
  text-align: center;
  padding: 40px;
  box-sizing: border-box;
}

.content {
  max-width: 500px;
}

.logo-icon {
  font-size: 48px;
  margin-bottom: 20px;
  filter: drop-shadow(0 0 10px #ffba43);
}

h2 {
  font-family: 'Press Start 2P', 'monacoregular', monospace;
  color: #ffba43;
  margin: 0 0 10px 0;
  letter-spacing: 1px;
}

.subtitle {
  font-size: 14px;
  color: #888;
  margin-bottom: 40px;
}

.steps {
  list-style: none;
  padding: 0;
  text-align: left;
  margin-bottom: 40px;
}

.steps li {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  align-items: flex-start;
}

.step-num {
  background: #ffba43;
  color: #000;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
  font-size: 12px;
}

.steps p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #ccc;
}

code {
  background: #333;
  padding: 2px 4px;
  border-radius: 3px;
  color: #fff;
}

.badge {
  display: inline-block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #ffba43;
  border: 1px solid #ffba43;
  padding: 4px 12px;
  border-radius: 20px;
  opacity: 0.7;
}
</style>
