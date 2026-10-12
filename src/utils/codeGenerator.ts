import { GLASS_PANE_COLORS } from '../components/MinecraftIcons';
import { PluginConfig } from '../types/plugin';

export interface GeneratedFile {
  path: string;
  filename: string;
  language: 'java' | 'yaml' | 'xml';
  description: string;
  content: string;
}

export function generatePluginFiles(config: PluginConfig, includePackageDeclaration = true): GeneratedFile[] {
  const rawPkg = (config.packageName || 'me.prime.jobs').trim().toLowerCase();
  const pkg = rawPkg.replace(/[^a-z0-9_.]/g, '') || 'me.prime.jobs';
  const pkgPath = includePackageDeclaration ? `${pkg.replace(/\./g, '/')}/` : '';
  const mainClassPath = includePackageDeclaration ? `${pkg}.PrimeJobsPlugin` : 'PrimeJobsPlugin';
  const glassMaterial = GLASS_PANE_COLORS[config.borderGlassColor]?.material || 'BLACK_STAINED_GLASS_PANE';

  const configYml = `# ==========================================================
# ${config.pluginName} v${config.version} — Official Configuration
# Compatible with Paper / Spigot ${config.apiVersion}+ & Vault Economy
# ==========================================================

settings:
  prefix: "&8[&a&l${config.pluginName}&8] &r"
  max-jobs-per-player: ${config.maxJobsPerPlayer}
  economy-symbol: "${config.economySymbol}"
  global-booster-multiplier: ${config.boosterMultiplier.toFixed(2)}
  actionbar-notifications: ${config.actionBarEnabled}
  sound-on-earn: ${config.soundOnEarn}
  level-up-broadcast: ${config.levelUpBroadcast}

gui:
  title: "${config.guiTitle}"
  rows: ${config.guiRows}
  border-material: "${glassMaterial}"
  stats-slot: 4
  close-slot: ${(config.guiRows - 1) * 9 + 4}

# ==========================================================
# 5 Server Professions & Economy Payouts
# ==========================================================
jobs:
${config.jobs
  .map(
    (job) => `  ${job.id}:
    display-name: "${job.displayName}"
    material: "${job.materialName}"
    slot: ${job.slot}
    max-level: ${job.maxLevel}
    base-xp-requirement: ${job.baseXpRequirement}
    income-multiplier-per-level: ${job.incomeMultiplierPerLevel}
    xp-multiplier-per-level: ${job.xpMultiplierPerLevel}
    lore:
${job.lore.map((line) => `      - "${line}"`).join('\n')}
    tasks:
${job.tasks
  .map(
    (task) => `      ${task.material}:
        action: "${task.actionType}"
        money: ${task.baseMoney.toFixed(2)}
        xp: ${task.baseXp.toFixed(2)}`
  )
  .join('\n')}`
  )
  .join('\n\n')}
`;

  const pluginYml = `name: ${config.pluginName}
version: '${config.version}'
main: ${mainClassPath}
api-version: '${config.apiVersion}'
authors: [ PrimeStudio ]
description: Prime 5-Job Economy & Interactive Chest GUI Plugin for Minecraft Servers
softdepend: [ Vault ]
commands:
  jobs:
    description: Open the PrimeJobs interactive GUI or manage professions
    aliases: [ job, primejobs ]
    usage: /jobs [join|leave|stats|top|boost|reload]
permissions:
  primejobs.use:
    description: Allows players to open the Job GUI and join jobs
    default: true
  primejobs.admin:
    description: Allows admins to reload config and set global economy boosters
    default: op
`;

  const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>${pkg}</groupId>
    <artifactId>${config.pluginName}</artifactId>
    <version>${config.version}</version>
    <packaging>jar</packaging>

    <name>${config.pluginName}</name>
    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <repositories>
        <repository>
            <id>spigotmc-repo</id>
            <url>https://hub.spigotmc.org/nexus/content/repositories/snapshots/</url>
        </repository>
        <repository>
            <id>sonatype</id>
            <url>https://oss.sonatype.org/content/groups/public/</url>
        </repository>
    </repositories>

    <dependencies>
        <dependency>
            <groupId>org.spigotmc</groupId>
            <artifactId>spigot-api</artifactId>
            <version>${config.apiVersion}.1-R0.1-SNAPSHOT</version>
            <scope>provided</scope>
        </dependency>
    </dependencies>

    <build>
        <defaultGoal>clean package</defaultGoal>
        <finalName>\${project.artifactId}-\${project.version}</finalName>
        <resources>
            <resource>
                <directory>src/main/resources</directory>
                <filtering>true</filtering>
            </resource>
        </resources>
    </build>
</project>
`;

  // Generate default fallback jobs in Java so the plugin works even if config.yml wasn't copied!
  const javaFallbackJobsCode = config.jobs
    .map((job) => {
      const loreList = job.lore.map((l) => `"${l.replace(/"/g, '\\"')}"`).join(', ');
      const taskPuts = job.tasks
        .map(
          (t) =>
            `        ${job.id}Tasks.put("${t.material}", new TaskReward("${t.material}", "${t.actionType}", ${t.baseMoney.toFixed(2)}, ${t.baseXp.toFixed(2)}));`
        )
        .join('\n');
      return `        Map<String, TaskReward> ${job.id}Tasks = new LinkedHashMap<>();
${taskPuts}
        jobs.put("${job.id}", new Job(
                "${job.id}",
                "${job.displayName.replace(/"/g, '\\"')}",
                matchMat("${job.materialName}", Material.DIAMOND_PICKAXE),
                ${job.slot},
                ${job.maxLevel},
                ${job.baseXpRequirement},
                ${job.incomeMultiplierPerLevel},
                ${job.xpMultiplierPerLevel},
                Arrays.asList(${loreList}),
                ${job.id}Tasks
        ));`;
    })
    .join('\n\n');

  const packageHeader = includePackageDeclaration ? `package ${pkg};\n\n` : '';

  // 100% SELF-CONTAINED SINGLE-FILE JAVA PLUGIN
  // Zero `import me...` lines — completely prevents "cannot resolve symbol 'me'" in IntelliJ / Eclipse!
  const singleFileJava = `${packageHeader}import net.md_5.bungee.api.ChatMessageType;
import net.md_5.bungee.api.chat.TextComponent;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.OfflinePlayer;
import org.bukkit.Sound;
import org.bukkit.block.Block;
import org.bukkit.block.data.Ageable;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.PluginCommand;
import org.bukkit.command.TabCompleter;
import org.bukkit.configuration.ConfigurationSection;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.entity.Item;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.entity.EntityDeathEvent;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.player.PlayerFishEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.InventoryHolder;
import org.bukkit.inventory.ItemFlag;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.plugin.RegisteredServiceProvider;
import org.bukkit.plugin.java.JavaPlugin;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * ${config.pluginName} v${config.version} — All-in-One 5-Job GUI & Economy Plugin
 * Single-file architecture: No external sub-package imports required.
 */
public final class PrimeJobsPlugin extends JavaPlugin implements Listener, CommandExecutor, TabCompleter {

    private Object vaultEconomyProvider = null;
    private final Map<String, Job> jobs = new LinkedHashMap<>();
    private final Map<UUID, Map<String, PlayerJobData>> playerDatabase = new ConcurrentHashMap<>();
    private final Map<UUID, Double> fallbackBalances = new ConcurrentHashMap<>();
    private double globalBooster = ${config.boosterMultiplier.toFixed(2)};

    @Override
    public void onEnable() {
        saveDefaultConfig();
        setupVaultEconomy();
        loadJobsFromConfig();

        PluginCommand jobsCmd = getCommand("jobs");
        if (jobsCmd != null) {
            jobsCmd.setExecutor(this);
            jobsCmd.setTabCompleter(this);
        }

        getServer().getPluginManager().registerEvents(this, this);
        getLogger().info("${config.pluginName} v${config.version} enabled with " + jobs.size() + " professions!");
    }

    private void setupVaultEconomy() {
        try {
            if (getServer().getPluginManager().getPlugin("Vault") == null) {
                getLogger().warning("Vault not detected. Using built-in PrimeJobs balance storage.");
                return;
            }
            Class<?> economyClass = Class.forName("net.milkbowl.vault.economy.Economy");
            RegisteredServiceProvider<?> rsp = getServer().getServicesManager().getRegistration(economyClass);
            if (rsp != null) {
                vaultEconomyProvider = rsp.getProvider();
                getLogger().info("Successfully hooked into Vault Economy!");
            }
        } catch (Throwable ignored) {
            getLogger().warning("Vault Economy provider not found. Using built-in balance storage.");
        }
    }

    public double getPlayerBalance(Player player) {
        if (vaultEconomyProvider != null) {
            try {
                Method m = vaultEconomyProvider.getClass().getMethod("getBalance", OfflinePlayer.class);
                Object res = m.invoke(vaultEconomyProvider, player);
                if (res instanceof Number num) {
                    return num.doubleValue();
                }
            } catch (Throwable ignored) {}
        }
        return fallbackBalances.getOrDefault(player.getUniqueId(), 0.0);
    }

    public void depositMoney(Player player, double amount) {
        fallbackBalances.merge(player.getUniqueId(), amount, Double::sum);
        if (vaultEconomyProvider != null) {
            try {
                Method m = vaultEconomyProvider.getClass().getMethod("depositPlayer", OfflinePlayer.class, double.class);
                m.invoke(vaultEconomyProvider, player, amount);
            } catch (Throwable ignored) {}
        }
    }

    private static Material matchMat(String name, Material fallback) {
        if (name == null) return fallback;
        Material m = Material.matchMaterial(name);
        return m != null ? m : fallback;
    }

    public void loadJobsFromConfig() {
        reloadConfig();
        jobs.clear();
        this.globalBooster = getConfig().getDouble("settings.global-booster-multiplier", ${config.boosterMultiplier.toFixed(2)});

        ConfigurationSection jobsSection = getConfig().getConfigurationSection("jobs");
        if (jobsSection != null) {
            for (String jobId : jobsSection.getKeys(false)) {
                ConfigurationSection sec = jobsSection.getConfigurationSection(jobId);
                if (sec == null) continue;

                String displayName = sec.getString("display-name", jobId);
                Material icon = matchMat(sec.getString("material"), Material.DIAMOND_PICKAXE);
                int slot = sec.getInt("slot", 20);
                int maxLevel = sec.getInt("max-level", 100);
                int baseXpReq = sec.getInt("base-xp-requirement", 100);
                double incomeMult = sec.getDouble("income-multiplier-per-level", 0.05);
                double xpMult = sec.getDouble("xp-multiplier-per-level", 0.15);
                List<String> lore = sec.getStringList("lore");

                Map<String, TaskReward> tasks = new LinkedHashMap<>();
                ConfigurationSection taskSec = sec.getConfigurationSection("tasks");
                if (taskSec != null) {
                    for (String matKey : taskSec.getKeys(false)) {
                        ConfigurationSection t = taskSec.getConfigurationSection(matKey);
                        if (t != null) {
                            tasks.put(matKey.toUpperCase(Locale.ROOT), new TaskReward(
                                    matKey.toUpperCase(Locale.ROOT),
                                    t.getString("action", "BREAK"),
                                    t.getDouble("money", 1.0),
                                    t.getDouble("xp", 2.0)
                            ));
                        }
                    }
                }

                jobs.put(jobId.toLowerCase(Locale.ROOT), new Job(
                        jobId.toLowerCase(Locale.ROOT),
                        displayName,
                        icon,
                        slot,
                        maxLevel,
                        baseXpReq,
                        incomeMult,
                        xpMult,
                        lore,
                        tasks
                ));
            }
        }

        // Built-in 5 Default Professions if config.yml is empty
        if (jobs.isEmpty()) {
${javaFallbackJobsCode}
        }
    }

    public Map<String, PlayerJobData> getPlayerJobs(UUID uuid) {
        return playerDatabase.computeIfAbsent(uuid, k -> new ConcurrentHashMap<>());
    }

    public int getActiveJobCount(UUID uuid) {
        int count = 0;
        for (PlayerJobData d : getPlayerJobs(uuid).values()) {
            if (d.isJoined()) count++;
        }
        return count;
    }

    public String color(String text) {
        return ChatColor.translateAlternateColorCodes('&', text == null ? "" : text);
    }

    // =========================================================================
    // INTERACTIVE 54-SLOT CHEST GUI & TASK SUB-GUI
    // =========================================================================

    public void openMainGui(Player player) {
        int rows = getConfig().getInt("gui.rows", ${config.guiRows});
        int size = Math.min(54, Math.max(27, rows * 9));
        String title = color(getConfig().getString("gui.title", "${config.guiTitle.replace(/"/g, '\\"')}"));

        Inventory inv = Bukkit.createInventory(new PrimeGuiHolder("MAIN", null), size, title);

        Material borderMat = matchMat(getConfig().getString("gui.border-material", "${glassMaterial}"), Material.BLACK_STAINED_GLASS_PANE);
        ItemStack filler = createItem(borderMat, "&8 ", Collections.emptyList(), false);
        for (int i = 0; i < size; i++) {
            if (i < 9 || i >= size - 9 || i % 9 == 0 || i % 9 == 8) {
                inv.setItem(i, filler);
            }
        }

        double balance = getPlayerBalance(player);
        int activeJobs = getActiveJobCount(player.getUniqueId());
        int maxJobs = getConfig().getInt("settings.max-jobs-per-player", ${config.maxJobsPerPlayer});
        inv.setItem(4, createItem(
                Material.EMERALD,
                "&a&lPlayer Economy Profile",
                Arrays.asList(
                        "&7Player: &f" + player.getName(),
                        "&7Vault Balance: &a${config.economySymbol}" + String.format("%.2f", balance),
                        "&7Active Professions: &e" + activeJobs + "&7/&e" + maxJobs,
                        "&7Server Booster: &b" + String.format("%.2fx", globalBooster)
                ),
                true
        ));

        Map<String, PlayerJobData> playerJobs = getPlayerJobs(player.getUniqueId());
        for (Job job : jobs.values()) {
            PlayerJobData data = playerJobs.computeIfAbsent(job.getId(), k -> new PlayerJobData());
            double maxXp = job.getRequiredXpForLevel(data.getLevel());
            int incomeBonus = (int) Math.round((data.getLevel() - 1) * job.getIncomeMultiplierPerLevel() * 100);

            List<String> formattedLore = new ArrayList<>();
            for (String line : job.getLore()) {
                formattedLore.add(color(line
                        .replace("%status%", data.isJoined() ? "&a&lEMPLOYED" : "&7Not Joined")
                        .replace("%level%", String.valueOf(data.getLevel()))
                        .replace("%max_level%", String.valueOf(job.getMaxLevel()))
                        .replace("%xp%", String.format("%.0f", data.getXp()))
                        .replace("%max_xp%", String.format("%.0f", maxXp))
                        .replace("%progress_bar%", buildProgressBar(data.getXp(), maxXp))
                        .replace("%income_bonus%", String.valueOf(incomeBonus))
                ));
            }

            ItemStack jobIcon = createItem(job.getMaterial(), job.getDisplayName(), formattedLore, data.isJoined());
            if (job.getSlot() >= 0 && job.getSlot() < size) {
                inv.setItem(job.getSlot(), jobIcon);
            }
        }

        int closeSlot = getConfig().getInt("gui.close-slot", size - 5);
        if (closeSlot >= 0 && closeSlot < size) {
            inv.setItem(closeSlot, createItem(Material.BARRIER, "&c&lClose Menu", Collections.singletonList("&7Click to close the Job menu."), false));
        }

        player.openInventory(inv);
    }

    public void openJobTaskSubGui(Player player, Job job) {
        Inventory inv = Bukkit.createInventory(
                new PrimeGuiHolder("TASKS", job.getId()),
                36,
                color("&8Tasks &7— " + job.getDisplayName())
        );

        PlayerJobData data = getPlayerJobs(player.getUniqueId())
                .computeIfAbsent(job.getId(), k -> new PlayerJobData());

        int slot = 10;
        for (TaskReward task : job.getTasks().values()) {
            if (slot == 17) slot = 19;
            if (slot >= 26) break;

            Material mat = matchMat(task.getTargetKey(), job.getMaterial());
            double scaledMoney = job.calculateMoneyPayout(task.getBaseMoney(), data.getLevel(), globalBooster);

            inv.setItem(slot++, createItem(
                    mat,
                    "&e&l" + task.getTargetKey().replace("_", " "),
                    Arrays.asList(
                            "&7Action Type: &f" + task.getActionType(),
                            "&7Base Payout: &a${config.economySymbol}" + String.format("%.2f", task.getBaseMoney()),
                            "&7Your Lv." + data.getLevel() + " Payout: &a&l${config.economySymbol}" + String.format("%.2f", scaledMoney),
                            "&7Job XP Reward: &b+" + String.format("%.1f XP", task.getBaseXp())
                    ),
                    false
            ));
        }

        inv.setItem(31, createItem(Material.ARROW, "&e&lBack to Professions", Collections.singletonList("&7Return to the main /jobs menu."), false));
        player.openInventory(inv);
    }

    private String buildProgressBar(double current, double max) {
        int totalBars = 12;
        int filled = (int) Math.round(Math.min(1.0, current / Math.max(1.0, max)) * totalBars);
        StringBuilder sb = new StringBuilder("&a");
        for (int i = 0; i < filled; i++) sb.append("■");
        sb.append("&8");
        for (int i = 0; i < totalBars - filled; i++) sb.append("■");
        return sb.toString();
    }

    private ItemStack createItem(Material material, String name, List<String> lore, boolean glow) {
        ItemStack item = new ItemStack(material != null ? material : Material.STONE);
        ItemMeta meta = item.getItemMeta();
        if (meta != null) {
            meta.setDisplayName(color(name));
            List<String> coloredLore = new ArrayList<>();
            for (String line : lore) {
                coloredLore.add(color(line));
            }
            meta.setLore(coloredLore);
            meta.addItemFlags(ItemFlag.HIDE_ATTRIBUTES, ItemFlag.HIDE_ENCHANTS);
            if (glow) {
                Enchantment glowEnchant = Enchantment.getByKey(NamespacedKey.minecraft("unbreaking"));
                if (glowEnchant != null) {
                    meta.addEnchant(glowEnchant, 1, true);
                }
            }
            item.setItemMeta(meta);
        }
        return item;
    }

    // =========================================================================
    // EVENT LISTENERS (GUI CLICKS, MINING, LOGGING, FARMING, HUNTING, FISHING)
    // =========================================================================

    @EventHandler
    public void onGuiClick(InventoryClickEvent event) {
        if (!(event.getInventory().getHolder() instanceof PrimeGuiHolder holder)) return;
        event.setCancelled(true);
        if (!(event.getWhoClicked() instanceof Player player)) return;

        int rawSlot = event.getRawSlot();
        if ("TASKS".equals(holder.getMenuType())) {
            if (rawSlot == 31) {
                openMainGui(player);
            }
            return;
        }

        int closeSlot = getConfig().getInt("gui.close-slot", 49);
        if (rawSlot == closeSlot) {
            player.closeInventory();
            return;
        }

        for (Job job : jobs.values()) {
            if (job.getSlot() == rawSlot) {
                if (event.isRightClick()) {
                    openJobTaskSubGui(player, job);
                    return;
                }

                Map<String, PlayerJobData> dataMap = getPlayerJobs(player.getUniqueId());
                PlayerJobData data = dataMap.computeIfAbsent(job.getId(), k -> new PlayerJobData());

                if (data.isJoined()) {
                    data.setJoined(false);
                    player.sendMessage(color("&8[&a&l${config.pluginName}&8] &7You have left the " + job.getDisplayName() + " &7profession."));
                    playSafeSound(player, "UI_BUTTON_CLICK", 0.8f, 0.8f);
                } else {
                    int maxJobs = getConfig().getInt("settings.max-jobs-per-player", ${config.maxJobsPerPlayer});
                    if (getActiveJobCount(player.getUniqueId()) >= maxJobs) {
                        player.sendMessage(color("&8[&a&l${config.pluginName}&8] &cYou have reached the maximum of " + maxJobs + " active jobs!"));
                        playSafeSound(player, "ENTITY_VILLAGER_NO", 1.0f, 1.0f);
                        return;
                    }
                    data.setJoined(true);
                    player.sendMessage(color("&8[&a&l${config.pluginName}&8] &aYou joined the " + job.getDisplayName() + " &aprofession!"));
                    playSafeSound(player, "ENTITY_PLAYER_LEVELUP", 0.7f, 1.4f);
                }
                openMainGui(player);
                break;
            }
        }
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onBlockBreak(BlockBreakEvent event) {
        Player player = event.getPlayer();
        Block block = event.getBlock();
        String key = block.getType().name();

        if (block.getBlockData() instanceof Ageable ageable) {
            if (ageable.getAge() < ageable.getMaximumAge()) {
                return;
            }
        }
        rewardMatchingJobs(player, key);
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onEntityKill(EntityDeathEvent event) {
        Player killer = event.getEntity().getKiller();
        if (killer == null) return;
        rewardMatchingJobs(killer, event.getEntityType().name());
    }

    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onPlayerFish(PlayerFishEvent event) {
        if (event.getState() != PlayerFishEvent.State.CAUGHT_FISH) return;
        if (!(event.getCaught() instanceof Item caughtItem)) return;
        rewardMatchingJobs(event.getPlayer(), caughtItem.getItemStack().getType().name());
    }

    private void rewardMatchingJobs(Player player, String targetKey) {
        Map<String, PlayerJobData> playerJobs = getPlayerJobs(player.getUniqueId());

        for (Job job : jobs.values()) {
            PlayerJobData data = playerJobs.get(job.getId());
            if (data == null || !data.isJoined()) continue;

            TaskReward reward = job.getTasks().get(targetKey);
            if (reward == null) continue;

            double money = job.calculateMoneyPayout(reward.getBaseMoney(), data.getLevel(), globalBooster);
            double xp = reward.getBaseXp() * globalBooster;

            depositMoney(player, money);
            data.addEarned(money);
            data.setXp(data.getXp() + xp);

            double reqXp = job.getRequiredXpForLevel(data.getLevel());
            if (data.getXp() >= reqXp && data.getLevel() < job.getMaxLevel()) {
                data.setXp(data.getXp() - reqXp);
                data.setLevel(data.getLevel() + 1);

                playSafeSound(player, "UI_TOAST_CHALLENGE_COMPLETE", 1.0f, 1.0f);
                if (getConfig().getBoolean("settings.level-up-broadcast", true)) {
                    Bukkit.broadcastMessage(color(
                            "&8[&a&l${config.pluginName}&8] &e" + player.getName() +
                            " &7reached &6Level " + data.getLevel() + " &7in " + job.getDisplayName() + "&7!"
                    ));
                }
            } else if (getConfig().getBoolean("settings.sound-on-earn", true)) {
                playSafeSound(player, "ENTITY_EXPERIENCE_ORB_PICKUP", 0.35f, 1.3f);
            }

            if (getConfig().getBoolean("settings.actionbar-notifications", true)) {
                String actionBar = color(
                        job.getDisplayName() + " &8| &a+${config.economySymbol}" + String.format("%.2f", money) +
                        " &8| &b+" + String.format("%.1f XP", xp) +
                        " &7(Lv." + data.getLevel() + ")"
                );
                player.spigot().sendMessage(ChatMessageType.ACTION_BAR, TextComponent.fromLegacyText(actionBar));
            }
        }
    }

    private void playSafeSound(Player player, String soundName, float volume, float pitch) {
        try {
            Sound s = Sound.valueOf(soundName);
            player.playSound(player.getLocation(), s, volume, pitch);
        } catch (IllegalArgumentException ignored) {}
    }

    // =========================================================================
    // /JOBS COMMAND & TAB COMPLETER
    // =========================================================================

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length == 0) {
            if (!(sender instanceof Player player)) {
                sender.sendMessage("Only in-game players can open the PrimeJobs Chest GUI.");
                return true;
            }
            openMainGui(player);
            return true;
        }

        String sub = args[0].toLowerCase(Locale.ROOT);
        switch (sub) {
            case "reload":
                if (!sender.hasPermission("primejobs.admin")) {
                    sender.sendMessage(color("&cYou do not have permission to execute this command."));
                    return true;
                }
                loadJobsFromConfig();
                sender.sendMessage(color("&8[&a&l${config.pluginName}&8] &aConfiguration and 5 jobs reloaded successfully."));
                break;

            case "boost":
                if (!sender.hasPermission("primejobs.admin") || args.length < 2) {
                    sender.sendMessage(color("&cUsage: /jobs boost <multiplier>"));
                    return true;
                }
                try {
                    double mult = Double.parseDouble(args[1]);
                    this.globalBooster = Math.max(0.1, mult);
                    sender.sendMessage(color("&8[&a&l${config.pluginName}&8] &eGlobal job payout booster set to &a" + this.globalBooster + "x&e!"));
                } catch (NumberFormatException ex) {
                    sender.sendMessage(color("&cInvalid multiplier number."));
                }
                break;

            case "join":
            case "leave":
                if (!(sender instanceof Player player) || args.length < 2) {
                    sender.sendMessage(color("&cUsage: /jobs " + sub + " <jobName>"));
                    return true;
                }
                Job job = jobs.get(args[1].toLowerCase(Locale.ROOT));
                if (job == null) {
                    player.sendMessage(color("&cUnknown profession. Available: " + String.join(", ", jobs.keySet())));
                    return true;
                }
                PlayerJobData data = getPlayerJobs(player.getUniqueId()).computeIfAbsent(job.getId(), k -> new PlayerJobData());
                boolean joining = "join".equals(sub);
                data.setJoined(joining);
                player.sendMessage(color("&8[&a&l${config.pluginName}&8] &7You have " + (joining ? "&ajoined" : "&cleft") + " &7" + job.getDisplayName()));
                break;

            case "stats":
                if (!(sender instanceof Player player)) return true;
                player.sendMessage(color("&8&m----------------------------------------"));
                player.sendMessage(color("&a&l${config.pluginName} &7— &fYour Profession Progress"));
                Map<String, PlayerJobData> map = getPlayerJobs(player.getUniqueId());
                for (Job j : jobs.values()) {
                    PlayerJobData d = map.computeIfAbsent(j.getId(), k -> new PlayerJobData());
                    player.sendMessage(color(
                            " &8• " + j.getDisplayName() + " &7Lv." + d.getLevel() +
                            " &8| &a${config.economySymbol}" + String.format("%.2f", d.getTotalEarned()) +
                            " &8| " + (d.isJoined() ? "&aEmployed" : "&7Idle")
                    ));
                }
                player.sendMessage(color("&8&m----------------------------------------"));
                break;

            default:
                if (sender instanceof Player player) {
                    openMainGui(player);
                }
                break;
        }
        return true;
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (args.length == 1) {
            return Arrays.asList("join", "leave", "stats", "boost", "reload");
        }
        if (args.length == 2 && ("join".equalsIgnoreCase(args[0]) || "leave".equalsIgnoreCase(args[0]))) {
            return new ArrayList<>(jobs.keySet());
        }
        return Collections.emptyList();
    }

    // =========================================================================
    // DATA MODELS (EMBEDDED TO PREVENT MISSING IMPORT ERRORS)
    // =========================================================================

    public static final class PrimeGuiHolder implements InventoryHolder {
        private final String menuType;
        private final String jobId;

        public PrimeGuiHolder(String menuType, String jobId) {
            this.menuType = menuType;
            this.jobId = jobId;
        }

        public String getMenuType() { return menuType; }
        public String getJobId() { return jobId; }

        @Override
        public Inventory getInventory() { return null; }
    }

    public static final class TaskReward {
        private final String targetKey;
        private final String actionType;
        private final double baseMoney;
        private final double baseXp;

        public TaskReward(String targetKey, String actionType, double baseMoney, double baseXp) {
            this.targetKey = targetKey;
            this.actionType = actionType;
            this.baseMoney = baseMoney;
            this.baseXp = baseXp;
        }

        public String getTargetKey() { return targetKey; }
        public String getActionType() { return actionType; }
        public double getBaseMoney() { return baseMoney; }
        public double getBaseXp() { return baseXp; }
    }

    public static final class Job {
        private final String id;
        private final String displayName;
        private final Material material;
        private final int slot;
        private final int maxLevel;
        private final int baseXpRequirement;
        private final double incomeMultiplierPerLevel;
        private final double xpMultiplierPerLevel;
        private final List<String> lore;
        private final Map<String, TaskReward> tasks;

        public Job(
                String id,
                String displayName,
                Material material,
                int slot,
                int maxLevel,
                int baseXpRequirement,
                double incomeMultiplierPerLevel,
                double xpMultiplierPerLevel,
                List<String> lore,
                Map<String, TaskReward> tasks
        ) {
            this.id = id;
            this.displayName = displayName;
            this.material = material;
            this.slot = slot;
            this.maxLevel = maxLevel;
            this.baseXpRequirement = baseXpRequirement;
            this.incomeMultiplierPerLevel = incomeMultiplierPerLevel;
            this.xpMultiplierPerLevel = xpMultiplierPerLevel;
            this.lore = lore;
            this.tasks = tasks;
        }

        public double getRequiredXpForLevel(int level) {
            return Math.round(baseXpRequirement * Math.pow(1.0 + xpMultiplierPerLevel, Math.max(0, level - 1)));
        }

        public double calculateMoneyPayout(double baseMoney, int level, double booster) {
            double levelMultiplier = 1.0 + ((level - 1) * incomeMultiplierPerLevel);
            return baseMoney * levelMultiplier * booster;
        }

        public String getId() { return id; }
        public String getDisplayName() { return displayName; }
        public Material getMaterial() { return material; }
        public int getSlot() { return slot; }
        public int getMaxLevel() { return maxLevel; }
        public double getIncomeMultiplierPerLevel() { return incomeMultiplierPerLevel; }
        public List<String> getLore() { return lore; }
        public Map<String, TaskReward> getTasks() { return tasks; }
    }

    public static final class PlayerJobData {
        private boolean joined = false;
        private int level = 1;
        private double xp = 0.0;
        private double totalEarned = 0.0;

        public boolean isJoined() { return joined; }
        public void setJoined(boolean joined) { this.joined = joined; }
        public int getLevel() { return level; }
        public void setLevel(int level) { this.level = level; }
        public double getXp() { return xp; }
        public void setXp(double xp) { this.xp = xp; }
        public double getTotalEarned() { return totalEarned; }
        public void addEarned(double amount) { this.totalEarned += amount; }
    }
}
`;

  return [
    {
      path: `src/main/java/${pkgPath}PrimeJobsPlugin.java`,
      filename: 'PrimeJobsPlugin.java',
      language: 'java',
      description: '100% Self-Contained Java Plugin (All 5 Jobs, Chest GUI, Listeners & Commands in 1 file — zero missing imports!).',
      content: singleFileJava,
    },
    {
      path: 'src/main/resources/plugin.yml',
      filename: 'plugin.yml',
      language: 'yaml',
      description: 'Bukkit/Paper plugin manifest registering /jobs command and permissions.',
      content: pluginYml,
    },
    {
      path: 'src/main/resources/config.yml',
      filename: 'config.yml',
      language: 'yaml',
      description: 'Complete server configuration for the 5 professions, GUI layout, and payouts.',
      content: configYml,
    },
    {
      path: 'pom.xml',
      filename: 'pom.xml',
      language: 'xml',
      description: 'Maven project descriptor configured for Spigot/Paper API (no external dependencies needed).',
      content: pomXml,
    },
    {
      path: '.github/workflows/build-plugin.yml',
      filename: 'build-plugin.yml',
      language: 'yaml',
      description: 'GitHub Actions workflow that automatically compiles the .jar in the cloud and publishes a GitHub Release.',
      content: `name: Build & Release ${config.pluginName} JAR

on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: maven

      - name: Compile Plugin JAR with Maven
        run: mvn -B clean package

      - name: Upload Compiled JAR to Actions Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${config.pluginName}-${config.version}-JAR
          path: target/${config.pluginName}-${config.version}.jar

      - name: Publish Compiled JAR to GitHub Releases
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${config.version}
          name: "${config.pluginName} v${config.version} (Ready-to-Use .JAR)"
          body: |
            ### ${config.pluginName} v${config.version} for Paper / Spigot ${config.apiVersion}+
            Download **\`${config.pluginName}-${config.version}.jar\`** below and drop it directly into your server's \`plugins/\` folder.
          files: target/${config.pluginName}-${config.version}.jar
`,
    },
  ];
}

// Pure TypeScript ZIP builder (Store mode with CRC32)
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function getReadmeContent(config: PluginConfig): string {
  return `# ${config.pluginName} v${config.version} (Spigot / Paper ${config.apiVersion}+)

Generated with PrimeJobs Studio.

## Single-File Architecture (Zero Missing Import Errors)
All plugin logic (\`PrimeJobsPlugin\`, 54-Slot Chest GUI, Event Listeners, \`/jobs\` Commands, and the 5 Professions) is contained in a single Java file: **\`PrimeJobsPlugin.java\`**.

## Local Compilation (Maven)
\`\`\`bash
mvn clean package
\`\`\`
Then copy \`target/${config.pluginName}-${config.version}.jar\` into your Minecraft server's \`plugins/\` folder.
`;
}

export function downloadMavenProjectZip(config: PluginConfig) {
  const files = generatePluginFiles(config, true);
  const encoder = new TextEncoder();
  const readmeContent = getReadmeContent(config);

  const allEntries = [
    ...files.map((f) => ({
      name: f.path,
      data: encoder.encode(f.content),
    })),
    {
      name: 'README.md',
      data: encoder.encode(readmeContent),
    },
  ];

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of allEntries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.data;
    const crc = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, dataBytes.length, true);
    lv.setUint32(22, dataBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, dataBytes.length, true);
    cv.setUint32(24, dataBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((acc, arr) => acc + arr.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, allEntries.length, true);
  ev.setUint16(10, allEntries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const blob = new Blob([...localParts, ...centralParts, eocd], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${config.pluginName}-${config.version}-GitHub-Ready.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function toBase64Utf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function pushPluginToGitHub(params: {
  config: PluginConfig;
  repoFullName: string;
  token: string;
  branch?: string;
  onProgress?: (msg: string) => void;
}): Promise<{ repoUrl: string; actionsUrl: string; releasesUrl: string }> {
  const { config, repoFullName, token, branch = 'main', onProgress } = params;
  const cleanRepo = repoFullName
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');

  if (!cleanRepo.includes('/')) {
    throw new Error('Please enter your repository in the format username/repository (e.g. steve/PrimeJobs).');
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token.trim()}`,
    'Content-Type': 'application/json',
  };

  onProgress?.(`Verifying GitHub repository ${cleanRepo}...`);
  const repoRes = await fetch(`https://api.github.com/repos/${cleanRepo}`, { headers });
  if (repoRes.status === 404) {
    throw new Error(
      `Repository "${cleanRepo}" not found or token lacks "repo" / "Contents: Read & Write" permission.`
    );
  }
  if (!repoRes.ok) {
    const errData = await repoRes.json().catch(() => ({}));
    throw new Error(errData.message || `GitHub API error (${repoRes.status})`);
  }

  const files = [
    ...generatePluginFiles(config, true).map((f) => ({ path: f.path, content: f.content })),
    { path: 'README.md', content: getReadmeContent(config) },
  ];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(`Uploading (${i + 1}/${files.length}): ${file.path}...`);

    let existingSha: string | undefined;
    const getRes = await fetch(
      `https://api.github.com/repos/${cleanRepo}/contents/${file.path}?ref=${encodeURIComponent(branch)}`,
      { headers }
    );
    if (getRes.ok) {
      const existingData = await getRes.json();
      existingSha = existingData.sha;
    }

    const putRes = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/${file.path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Update ${file.path} via PrimeJobs Studio`,
        content: toBase64Utf8(file.content),
        branch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      throw new Error(
        `Failed uploading ${file.path}: ${errData.message || putRes.statusText} (Ensure token has "repo" and "workflow" permissions)`
      );
    }
  }

  return {
    repoUrl: `https://github.com/${cleanRepo}`,
    actionsUrl: `https://github.com/${cleanRepo}/actions`,
    releasesUrl: `https://github.com/${cleanRepo}/releases`,
  };
}
