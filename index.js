const { 
    Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, 
    EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder
} = require("discord.js");
require("dotenv").config();

// ---------------- CONFIG ----------------
const CHANNEL_ID = "1442239451534332049"; 
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
// ----------------------------------------

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

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

// ================= GIVEAWAYS STORAGE =================
const giveaways = new Map(); // messageId => array de userId

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

    // FETCH IMAGE FROM ATTACHMENT
    try {
        const msg = await channel.messages.fetch(messageId);
        if (msg.attachments.size > 0) {
            imageURL = msg.attachments.first().url;
        } else {
            return interaction.reply({ content: "Mesajul nu conține nicio imagine.", ephemeral: true });
        }
    } catch {
        return interaction.reply({ content: "Nu am găsit mesajul cu ID-ul dat.", ephemeral: true });
    }

    // CREATE EMBED
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

    // BUTTON
    const button = new ButtonBuilder()
        .setCustomId("enter_giveaway")
        .setEmoji("⭐")
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    // SEND GIVEAWAY
    const giveawayMessage = await channel.send({ embeds: [embed], components: [row] });

    // INITIALIZE PARTICIPANTS
    giveaways.set(giveawayMessage.id, []);

    await interaction.reply({ content: "Giveaway creat cu succes! 🎉", ephemeral: true });
});

// ================= BUTTON HANDLER =================
client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== "enter_giveaway") return;

    const message = interaction.message;

    if (!giveaways.has(message.id)) {
        giveaways.set(message.id, []);
    }

    const participants = giveaways.get(message.id);

    // CHECK IF USER ALREADY ENTERED
    if (participants.includes(interaction.user.id)) {
        return interaction.reply({
            content: "Ești deja înscris în giveaway!",
            ephemeral: true
        });
    }

    participants.push(interaction.user.id);
    giveaways.set(message.id, participants);

    // UPDATE EMBED
    const embed = EmbedBuilder.from(message.embeds[0]);
    embed.setFooter({ text: `Entries: ${participants.length}` });

    await message.edit({ embeds: [embed] });

    await interaction.reply({
        content: "Te-ai înscris în giveaway! ⭐",
        ephemeral: true
    });
});

// ================= START BOT =================
client.once("ready", () => {
    console.log(`Bot pornit ca ${client.user.tag}`);
});

registerCommands();
client.login(TOKEN);
