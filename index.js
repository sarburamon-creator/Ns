const { 
    Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, 
    EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder
} = require("discord.js");
require("dotenv").config();

const CHANNEL_ID = "1442239451534332049"; 
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// ================= REGISTER COMMAND =================
const commands = [
    new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("Creează un giveaway.")
        .addStringOption(option =>
            option.setName("titlu")
                .setDescription("Numele premiului.")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("durata")
                .setDescription("Ex: 10m, 2h, 1d")
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName("castigatori")
                .setDescription("Număr câștigători.")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("mesaj_id")
                .setDescription("ID-ul mesajului cu poza")
                .setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function registerCommands() {
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log("✔ Comenzile au fost înregistrate.");
    } catch (err) {
        console.error(err);
    }
}

// ================= HANDLE COMMAND =================
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "giveaway") return;

    const title = interaction.options.getString("titlu");
    const duration = interaction.options.getString("durata");
    const winners = interaction.options.getInteger("castigatori");
    const messageId = interaction.options.getString("mesaj_id");

    const channel = await client.channels.fetch(CHANNEL_ID);
    let imageURL;

    try {
        const msg = await channel.messages.fetch(messageId);
        if (msg.attachments.size > 0) {
            // luăm prima imagine
            imageURL = msg.attachments.first().url;
        } else {
            return interaction.reply({ content: "Mesajul nu conține nicio imagine.", ephemeral: true });
        }
    } catch {
        return interaction.reply({ content: "Nu am găsit mesajul cu ID-ul dat.", ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setTitle(`${title} ⭐`)
        .setDescription(
            `Win **${title}**!\n\n` +
            `Ends\n**${duration}**\n` +
            `Host\n<@${interaction.user.id}>\n` +
            `Winners\n${winners}`
        )
        .setColor("#ffdd33")
        .setImage(imageURL)
        .setFooter({ text: "Entries: 0" });

    const button = new ButtonBuilder()
        .setCustomId("enter_giveaway")
        .setEmoji("⭐")
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({ content: "Giveaway creat cu succes! 🎉", ephemeral: true });
});

// ================= BUTTON HANDLER =================
client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== "enter_giveaway") return;

    await interaction.reply({ content: "Te-ai înscris în giveaway! ⭐", ephemeral: true });
});

// ================= START BOT =================
client.once("ready", () => {
    console.log(`Bot pornit ca ${client.user.tag}`);
});

registerCommands();
client.login(TOKEN);
