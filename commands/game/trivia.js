const axios = require('axios');

let triviaGames = {};

async function triviaCommand(sock, chatId, msg, args) {
    const answer = args.join(' ');

    if (!answer) {
        // Start a new game
        if (triviaGames[chatId]) {
            await sock.sendMessage(chatId, { text: 'كاينة لعبة ديجا بدات!' }, { quoted: msg });
            return;
        }

        try {
            const questions = [
                { q: "شنو هي عاصمة المغرب؟", a: "الرباط", o: ["الرباط", "الدار البيضاء", "مراكش", "فاس"] },
                { q: "شكون هو اللي بنى مدينة فاس؟", a: "إدريس الثاني", o: ["إدريس الأول", "إدريس الثاني", "يوسف بن تاشفين", "المنصور"] },
                { q: "فأي عام استاقل المغرب؟", a: "1956", o: ["1956", "1944", "1999", "1912"] },
                { q: "شنو هي أكبر مدينة فالمغرب؟", a: "الدار البيضاء", o: ["الرباط", "الدار البيضاء", "طنجة", "أكادير"] },
                { q: "شنو هو الجبل اللي فيه أعلى قمة فالمغرب؟", a: "توبقال", o: ["توبقال", "العياشي", "مكون", "بويبلان"] },
                { q: "شكون هو المنتخب الإفريقي اللي وصل لنصف نهائي كأس العالم 2022؟", a: "المغرب", o: ["المغرب", "مصر", "السنغال", "الكاميرون"] },
                { q: "شنو هي العملة الرسمية ديال المغرب؟", a: "الدرهم", o: ["الدرهم", "الدينار", "الريال", "الأورو"] },
                { q: "فين جات ساحة جامع الفنا؟", a: "مراكش", o: ["مراكش", "فاس", "مكناس", "الصويرة"] },
                { q: "شمن بحر كاين فالشمال ديال المغرب؟", a: "البحر الأبيض المتوسط", o: ["المحيط الأطلسي", "البحر الأبيض المتوسط", "البحر الأحمر", "بحر العرب"] },
                { q: "شكون هو الفنان اللي غنا 'أنتي باغية واحد'؟", a: "سعد لمجرد", o: ["سعد لمجرد", "حاتم عمور", "الدوزي", "زهير بهاوي"] }
            ];

            const questionData = questions[Math.floor(Math.random() * questions.length)];

            triviaGames[chatId] = {
                question: questionData.q,
                correctAnswer: questionData.a,
                options: questionData.o.sort(() => Math.random() - 0.5),
            };

            await sock.sendMessage(chatId, {
                text: `🎮 *وقت المسابقات! (Trivia)*\n\n*السؤال:*\n${triviaGames[chatId].question}\n\n*الخيارات:*\n${triviaGames[chatId].options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\n💡 أجب بـ: .trivia <جوابك>`
            }, { quoted: msg });
        } catch (error) {
            console.error('Trivia Error:', error);
            await sock.sendMessage(chatId, { text: 'Error fetching trivia question. Try again later.' }, { quoted: msg });
        }
    } else {
        // Answer existing game
        if (!triviaGames[chatId]) {
            await sock.sendMessage(chatId, { text: 'No trivia game is in progress. Start one with .trivia' }, { quoted: msg });
            return;
        }

        const game = triviaGames[chatId];
        const isCorrect = answer.toLowerCase() === game.correctAnswer.toLowerCase() ||
            (parseInt(answer) > 0 && game.options[parseInt(answer) - 1]?.toLowerCase() === game.correctAnswer.toLowerCase());

        if (isCorrect) {
            await sock.sendMessage(chatId, { text: `✅ صحيح! الإجابة هي: *${game.correctAnswer}*` }, { quoted: msg });
            delete triviaGames[chatId];
        } else {
            await sock.sendMessage(chatId, { text: `❌ خطأ! حاول مرة أخرى أو انتظر السؤال القادم.` }, { quoted: msg });
        }
    }
}

module.exports = triviaCommand;
