function spinner({ color, line }) {
  // TODO: Send the tickCount or time in here?
  color(255, 0, 0);
  line(0, 0, 10, 10);
  line(0, 10, 10, 0);
}

export { spinner };
