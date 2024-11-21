import { Telegraf, Context } from "telegraf";
import sqlite3 from "sqlite3";
import { Message } from "telegraf/typings/core/types/typegram";

// Интерфейс пользователя
interface User {
  id: number;
  weight: number;
  steps: number;
  water: number;
}

// Подключение базы данных
const db = new sqlite3.Database("./data.db", (err) => {
  if (err) {
    console.error("Ошибка подключения к базе данных:", err.message);
  } else {
    console.log("База данных подключена.");
  }
});

// Создание таблицы
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        weight REAL DEFAULT 0,
        steps INTEGER DEFAULT 0,
        water INTEGER DEFAULT 0
    )
`);

// Инициализация бота
const bot = new Telegraf("7667791922:AAEx7pLXoVtAmTfqFJsc0BvGfd30EJOrgPQ"); // Вставьте ваш токен

// Команда /start
bot.start((ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  db.run(`INSERT OR IGNORE INTO users (id) VALUES (?)`, [userId], (err) => {
    if (err) {
      console.error("Ошибка добавления пользователя:", err.message);
      return ctx.reply("Ошибка при добавлении пользователя.");
    }
    ctx.reply(
      "Привет! Я помогу тебе следить за водой, весом и шагами. Введи /help для списка команд."
    );
  });
});

// Команда /help
bot.command("help", (ctx: Context) => {
  ctx.reply(`
        Список команд:
        - /log_water <кол-во> — Добавить количество выпитой воды.
        - /steps <шаги> — Указать шаги за день.
        - /weight <вес> — Указать вес.
        - /progress — Посмотреть прогресс.
    `);
});

// Команда для учёта воды
bot.command("log_water", (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return ctx.reply("Не удалось определить ваш идентификатор.");

  if (ctx.message && "text" in ctx.message) {
    const input = ctx.message.text.split(" ")[1];
    const water = parseInt(input || "", 10);
    if (isNaN(water)) {
      return ctx.reply("Укажите количество воды в миллилитрах.");
    }

    db.run(
      `UPDATE users SET water = water + ? WHERE id = ?`,
      [water, userId],
      (err) => {
        if (err) {
          console.error("Ошибка добавления воды:", err.message);
          return ctx.reply("Ошибка при добавлении воды.");
        }
        ctx.reply(`Добавлено ${water} мл воды.`);
      }
    );
  } else {
    ctx.reply("Сообщение не содержит текста.");
  }
});

// Команда для записи шагов
bot.command("steps", (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return ctx.reply("Не удалось определить ваш идентификатор.");

  if (ctx.message && "text" in ctx.message) {
    const input = ctx.message.text.split(" ")[1];
    const steps = parseInt(input || "", 10);
    if (isNaN(steps)) return ctx.reply("Укажите количество шагов.");

    db.run(
      `UPDATE users SET steps = ? WHERE id = ?`,
      [steps, userId],
      (err) => {
        if (err) {
          console.error("Ошибка обновления шагов:", err.message);
          return ctx.reply("Ошибка при обновлении шагов.");
        }
        ctx.reply(`Шаги обновлены: ${steps}`);
      }
    );
  } else {
    ctx.reply("Сообщение не содержит текста.");
  }
});

// Команда для записи веса
bot.command("weight", (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return ctx.reply("Не удалось определить ваш идентификатор.");

  if (ctx.message && "text" in ctx.message) {
    const input = ctx.message.text.split(" ")[1];
    const weight = parseFloat(input || "");
    if (isNaN(weight)) return ctx.reply("Укажите вес числом.");

    db.run(
      `UPDATE users SET weight = ? WHERE id = ?`,
      [weight, userId],
      (err) => {
        if (err) {
          console.error("Ошибка обновления веса:", err.message);
          return ctx.reply("Ошибка при обновлении веса.");
        }
        ctx.reply(`Вес обновлен: ${weight} кг`);
      }
    );
  } else {
    ctx.reply("Сообщение не содержит текста.");
  }
});

// Команда для просмотра прогресса
bot.command("progress", (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return ctx.reply("Не удалось определить ваш идентификатор.");

  db.get<User>(`SELECT * FROM users WHERE id = ?`, [userId], (err, row) => {
    if (err) {
      console.error("Ошибка получения данных:", err.message);
      return ctx.reply("Ошибка при получении данных.");
    }

    if (!row) return ctx.reply("Сначала введите данные!");

    ctx.reply(`
                Прогресс:
                - Вес: ${row.weight || "Не указан"} кг
                - Вода: ${row.water || 0} мл
                - Шаги: ${row.steps || 0}
            `);
  });
});

// Управление вебхуком и запуск
async function initializeBot() {
  console.log("Проверка токена...");

  try {
    // Проверка подключения
    const botInfo = await bot.telegram.getMe();
    console.log("Бот успешно подключен:", botInfo);

    // Удаление вебхука, если он активен
    const webhookInfo = await bot.telegram.getWebhookInfo();
    if (webhookInfo.url) {
      console.log("Обнаружен активный вебхук:", webhookInfo.url);
      console.log("Удаляем вебхук...");
      await bot.telegram.deleteWebhook();
      console.log("Вебхук удалён.");
    }

    // Запуск бота
    await bot.launch();
    console.log("Бот запущен!");
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Ошибка при инициализации бота:", error.message);
    } else {
      console.error("Неизвестная ошибка при инициализации бота:", error);
    }
  }
}


initializeBot();
