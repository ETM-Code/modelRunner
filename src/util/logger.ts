const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";

export function header(text: string) {
  console.log(`\n${BOLD}${CYAN}═══ ${text} ═══${RESET}\n`);
}

export function roundMarker(round: number, total: number) {
  console.log(`${DIM}─── Round ${round}/${total} ───${RESET}`);
}

export function agentLabel(name: string, backend: string, side: "a" | "b") {
  const color = side === "a" ? MAGENTA : CYAN;
  console.log(`\n${BOLD}${color}[${name} (${backend})]${RESET}`);
}

export function agentText(text: string) {
  console.log(text);
}

export function concession(agent: string) {
  console.log(`\n${BOLD}${YELLOW}★ ${agent} has CONCEDED! ★${RESET}\n`);
}

export function result(winner: string, reason: string) {
  console.log(`${BOLD}${GREEN}Result: ${winner} wins (${reason})${RESET}`);
}

export function error(msg: string) {
  console.error(`${RED}Error: ${msg}${RESET}`);
}

export function info(msg: string) {
  console.log(`${DIM}${msg}${RESET}`);
}
