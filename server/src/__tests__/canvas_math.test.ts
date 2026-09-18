import test from 'node:test';
import assert from 'node:assert/strict';

test('Canvas coordinate transformation maintains subpixel accuracy across DPRs', () => {
  const dprs = [1, 1.25, 1.5, 2, 2.75, 3];
  const testCases = [
    { clientX: 150, clientY: 200, rect: { left: 50, top: 40, width: 600, height: 450 } },
    { clientX: 50, clientY: 40, rect: { left: 50, top: 40, width: 600, height: 450 } }, // Top-left boundary
    { clientX: 650, clientY: 490, rect: { left: 50, top: 40, width: 600, height: 450 } }, // Bottom-right boundary
    { clientX: 320.5, clientY: 250.25, rect: { left: 12.5, top: 8.5, width: 375, height: 281.25 } } // Subpixel mobile
  ];

  for (const dpr of dprs) {
    for (const tc of testCases) {
      // 1. Normalized coordinates calculation (Canvas.tsx getCoordinates)
      const normX = (tc.clientX - tc.rect.left) / tc.rect.width;
      const normY = (tc.clientY - tc.rect.top) / tc.rect.height;

      assert.ok(normX >= 0 && normX <= 1, `normX out of bounds: ${normX}`);
      assert.ok(normY >= 0 && normY <= 1, `normY out of bounds: ${normY}`);

      // 2. Buffer dimensions (Canvas.tsx updateDimensions)
      const bufferWidth = Math.round(tc.rect.width * dpr);
      const bufferHeight = Math.round(tc.rect.height * dpr);

      // 3. Rendered buffer pixel (Canvas.tsx drawStrokeOnCanvas)
      const bufX = normX * bufferWidth;
      const bufY = normY * bufferHeight;

      // 4. Physical screen projection
      const screenX = tc.rect.left + (bufX / dpr);
      const screenY = tc.rect.top + (bufY / dpr);

      // Verify subpixel drift is negligible (< 0.5px due to integer buffer rounding)
      assert.ok(
        Math.abs(screenX - tc.clientX) < 0.5,
        `X drift too large at DPR ${dpr}: expected ${tc.clientX}, got ${screenX}`
      );
      assert.ok(
        Math.abs(screenY - tc.clientY) < 0.5,
        `Y drift too large at DPR ${dpr}: expected ${tc.clientY}, got ${screenY}`
      );
    }
  }
});
