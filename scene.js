// Circuit-board background: one canvas, one scene. Pauses when the tab is hidden.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
try {
  const cv = document.getElementById('bg'), small = innerWidth < 700;
  const r = new THREE.WebGLRenderer({canvas: cv, antialias: !small}); r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x06100c); sc.fog = new THREE.Fog(0x06100c, 12, 32);
  const cam = new THREE.PerspectiveCamera(50, 1, .1, 100);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({color: 0x09170f})); board.rotation.x = -Math.PI / 2; sc.add(board);
  // traces: staircase paths radiating from the chip; each ends in a pad; a lime pulse runs along each
  const N = small ? 14 : 30, paths = [], lm = new THREE.LineBasicMaterial({color: 0xc98a3d});
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2 + .1, sx = Math.sign(Math.cos(a)) || 1, sz = Math.sign(Math.sin(a)) || 1;
    let x = Math.cos(a) * 2.2, z = Math.sin(a) * 2.2, alongX = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)); const pts = [new THREE.Vector3(x, .02, z)];
    for (let k = 0; k < 5; k++) { const L = 1.5 + Math.random() * 3; if (alongX) x += sx * L; else z += sz * L; pts.push(new THREE.Vector3(x, .02, z)); alongX = !alongX; }
    sc.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lm));
    const seg = [], tot = pts.slice(1).reduce((s, p, j) => (seg.push(s), s + p.distanceTo(pts[j])), 0); paths.push({pts, seg, tot, t: Math.random(), v: .05 + Math.random() * .06}); }
  const pads = new THREE.InstancedMesh(new THREE.CylinderGeometry(.14, .14, .04, 12), new THREE.MeshBasicMaterial({color: 0xc98a3d}), N), m4 = new THREE.Matrix4();
  paths.forEach((p, i) => { const e = p.pts[p.pts.length - 1]; pads.setMatrixAt(i, m4.setPosition(e.x, .03, e.z)); }); sc.add(pads);
  const pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(.1, 8, 8), new THREE.MeshBasicMaterial({color: 0xb8ff3a}), N); sc.add(pulses);
  // IC chip with etched label and instanced pins
  const chip = new THREE.Mesh(new THREE.BoxGeometry(3, .5, 3), new THREE.MeshBasicMaterial({color: 0x050a08})); chip.position.y = .25; sc.add(chip);
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = 256; const g = cvs.getContext('2d'); g.fillStyle = '#050a08'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#c98a3d'; g.font = '700 38px monospace'; g.textAlign = 'center'; g.fillText('TECHNOVA', 128, 120); g.fillText('2026', 128, 164); g.beginPath(); g.arc(30, 30, 8, 0, 7); g.fill();
  const top = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), new THREE.MeshBasicMaterial({map: new THREE.CanvasTexture(cvs)})); top.rotation.x = -Math.PI / 2; top.position.y = .51; sc.add(top);
  const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(.25, .08, .12), new THREE.MeshBasicMaterial({color: 0xc98a3d}), 32); let pi = 0;
  for (let s = 0; s < 4; s++) for (let k = 0; k < 8; k++) { const o = -1.2 + k * .34, q = new THREE.Matrix4().makeRotationY(s * Math.PI / 2); q.setPosition(...(s % 2 ? [s === 1 ? 1.6 : -1.6, .1, o] : [o, .1, s === 0 ? 1.6 : -1.6])); pins.setMatrixAt(pi++, q); } sc.add(pins);
  let mx = 0, my = 0; addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
  function size() { r.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); } addEventListener('resize', size); size();
  const still = matchMedia('(prefers-reduced-motion:reduce)').matches, tmp = new THREE.Vector3(), ch = new THREE.Color(); let t0 = 0;
  function frame(t) { if (!document.hidden) { const dt = (t - t0) / 1000; t0 = t; const sp = scrollY / Math.max(1, document.body.scrollHeight - innerHeight);
    paths.forEach((p, i) => { p.t = (p.t + p.v * dt) % 1; let d = p.t * p.tot, k = p.seg.length - 1; while (k > 0 && p.seg[k] > d) k--; const a = p.pts[k], b = p.pts[k + 1];
      tmp.lerpVectors(a, b, Math.min(1, (d - p.seg[k]) / a.distanceTo(b))); pulses.setMatrixAt(i, m4.setPosition(tmp.x, .06, tmp.z)); }); pulses.instanceMatrix.needsUpdate = true;
    cam.position.set(Math.sin(t / 9000) * 1.2 + mx * 2 + sp * 8, 7 + my, 9 - sp * 3); cam.lookAt(sp * 8, 0, 0);
    chip.material.color.set(ch.setHSL(.25, .8, .02 + .04 * Math.sin(sp * 6.28)).getHex()); r.render(sc, cam); }
    if (!still) requestAnimationFrame(frame); }
  requestAnimationFrame(frame); if (still) { frame(0); addEventListener('scroll', () => frame(0)); }
} catch (e) { document.body.classList.add('nowebgl'); }
