export function reload(player, updateAmmoDisplay) {
  if (player.ammo === player.magazineSize || player.reserveAmmo === 0) return;
  const needed = player.magazineSize - player.ammo;
  const toLoad = Math.min(needed, player.reserveAmmo);
  player.ammo += toLoad;
  player.reserveAmmo -= toLoad;
  updateAmmoDisplay();
  // Optionally play reload sound here
}
