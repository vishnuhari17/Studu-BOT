const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_IDS = process.env.ADMIN_IDS.split(',').map(id => parseInt(id));
const API_URL = process.env.API_URL;
const { format } = require('date-fns');

async function startBot() {
    const bot = new TelegramBot(TOKEN, { polling: true });
    console.log('Bot is starting');

    bot.onText(/\/start/, async (msg) => {
        await handleStartCommand(bot, msg);
    });


    bot.onText(/\/assignment/, async (msg) => {
        await handleAssignmentCommand(bot, msg);
    });

    bot.onText(/\/pyq/, async (msg) => {
        if (ADMIN_IDS.includes(msg.from.id)) {
            await handleAdminCommand(bot, msg, handlePyqMenu);
        } else {
            await handleViewPyq(bot, msg);
        }
    });

    bot.onText(/\/notes/, async (msg) => {
        if (ADMIN_IDS.includes(msg.from.id)) {
            await handleAdminCommand(bot, msg, handleNotesMenu);
        } else {
            await handleViewNotes(bot, msg);
        }
    });

    bot.onText(/\/subject/, async (msg) => {
        if (ADMIN_IDS.includes(msg.from.id)) {
            await handleAdminCommand(bot, msg, handleSubjectMenu);
        } else {
            await handleSubjectCommand(bot, msg);
        }
    });

    bot.onText(/\/addassignment/, async (msg) => {
        await handleAdminCommand(bot, msg, handleAddAssignment);
    });

    bot.onText(/\/addpyq/, async (msg) => {
        await handleAdminCommand(bot, msg, handleAddPyq);
    });

    bot.onText(/\/addnote/, async (msg) => {
        await handleAdminCommand(bot, msg, handleAddNote);
    });

    bot.onText(/\/addSubject/, async (msg) => {
        await handleAdminCommand(bot, msg, handleAddSubject);
    });

    bot.onText(/\/back/, (msg) => {
        handleBackCommand(bot, msg);
    });

    // Handle view commands
    bot.onText(/\/viewpyqs/, async (msg) => {
        await handleViewPyq(bot, msg);
    });

    bot.onText(/\/viewnotes/, async (msg) => {
        await handleViewNotes(bot, msg);
    });

    bot.onText(/\/viewSubjects/, async (msg) => {
        await handleSubjectCommand(bot, msg);
    });
}

async function handleStartCommand(bot, msg) {
    const { id, first_name, last_name, username } = msg.from;
    try {
        let response;
        try {
            response = await axios.get(`${API_URL}/student_details/${id}`);
            handleWelcomeMessage(bot, msg);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                await handleNewUserRegistration(bot, id, first_name, last_name, username);
            } else {
                console.error("Error fetching student details:", error);
                bot.sendMessage(id, "An error occurred while fetching your details. Please try again later.");
            }
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            await handleNewUserRegistration(bot, id, first_name, last_name, username);
        } else {
            console.error("Error fetching student details:", error);
            bot.sendMessage(id, "An error occurred while fetching your details. Please try again later.");
        }
    }
}

async function handleAdminCommand(bot, msg, adminHandler) {
    if (!ADMIN_IDS.includes(msg.from.id)) {
        return bot.sendMessage(msg.chat.id, "You are not authorized to perform this action.");
    }
    await adminHandler(bot, msg);
}

async function handleWelcomeMessage(bot, msg) {
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "/assignment" }, { text: "/timetable" }],
                [{ text: "/notes" }, { text: "/pyq" }],
                [{ text: "/subject" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
    bot.sendMessage(msg.chat.id, "How can I help you today?", options);
}

async function handleAddSubject(bot, msg) {
    bot.sendMessage(msg.chat.id, "Please enter the subject code:");
    const subjectCode = await getUserInput(bot, msg.chat.id);
    bot.sendMessage(msg.chat.id, "Please enter the subject name:");
    const subjectName = await getUserInput(bot, msg.chat.id);
    bot.sendMessage(msg.chat.id, "Please enter the subject credits:");
    const subjectCredits = await getUserInput(bot, msg.chat.id);
    const response = await axios.post(`${API_URL}/subjects`, {
        subject_code: subjectCode,
        subject_name: subjectName,
        credits: subjectCredits
    });
    if (response.status === 201) {
        bot.sendMessage(msg.chat.id, `Subject ${subjectName} added successfully.`);
    } else {
        bot.sendMessage(msg.chat.id, `Subject ${subjectName} already exists.`);
    }
}

async function handleSubjectCommand(bot, msg) {
    try {
        const subjectsResponse = await axios.get(`${API_URL}/subjects`);
        const subjects = subjectsResponse.data;
        if (subjects.length === 0) {
            bot.sendMessage(msg.chat.id, "No subjects available.");
            return;
        }
        
        const subjectList = subjects.map(sub => {
            return `*Subject:* ${sub.subject_name}\n*Subject Code:* ${sub.subject_code}\n*Credits:* ${sub.credits}`;
        }).join('\n\n');
        
        bot.sendMessage(msg.chat.id, `*Subjects:*\n\n${subjectList}`, { parse_mode: 'Markdown' });

    } catch (error) {
        console.error("Error fetching subjects:", error);
        bot.sendMessage(msg.chat.id, "Failed to fetch subjects. Please try again.");
    }
}

async function handleAssignmentCommand(bot, msg) {
    console.log(`User ${msg.from.username} with name ${msg.from.first_name} ${msg.from.last_name} requested assignments`);
    try {
        const assignmentsResponse = await axios.get(`${API_URL}/assignments`);
        const assignments = assignmentsResponse.data;
        const today = new Date().toISOString().split('T')[0];

        const upcomingAssignments = assignments.filter(assignment => assignment.date_of_submission >= today);

        if (upcomingAssignments.length === 0) {
            bot.sendMessage(msg.chat.id, "No upcoming assignments available.");
            return;
        }

        const assignmentList = upcomingAssignments.map(assignment => {
            const formattedDate = format(new Date(assignment.date_of_submission), "do MMM");
            return `Assignment: ${assignment.assignment_title}\nDate of Submission: ${formattedDate}`;
        }).join('\n\n');

        bot.sendMessage(msg.chat.id, `Upcoming Assignments:\n\n${assignmentList}`);
    } catch (error) {
        console.error("Error fetching assignments:", error);
        bot.sendMessage(msg.chat.id, "Failed to fetch assignments. Please try again.");
    }
}

async function handleNewUserRegistration(bot, id, first_name, last_name, username) {
    console.log(`New user ${username} with name ${first_name} ${last_name} started the bot`);
    await bot.sendMessage(id, `Welcome ${first_name}! You are not registered in the system.`);
    await bot.sendMessage(id, `Let's get you registered. Please enter your email id:`);

    try {
        const email = await getUserInput(bot, id);
        await bot.sendMessage(id, `Please enter your date of birth (YYYY-MM-DD):`);
        const dob = await getUserInput(bot, id);
        await bot.sendMessage(id, `Please enter your class:`);
        const studentClass = await getUserInput(bot, id);
        await registerUser(id, first_name, last_name, email, dob, studentClass);
        await bot.sendMessage(id, `You are successfully registered.`);
    } catch (error) {
        console.error("Error registering student:", error);
        await bot.sendMessage(id, `Failed to register. Please try again.`);
    }
}

async function getUserInput(bot, id) {
    const msg = await new Promise(resolve => bot.once("message", resolve));
    return msg.text;
}

async function registerUser(id, first_name, last_name, email, dob, studentClass) {
    await axios.post(`${API_URL}/student_details`, {
        student_id: id,
        student_name: `${first_name} ${last_name}`,
        student_class: studentClass,
        dob: dob,
        email_id: email,
    });
}

async function handleAddPyq(bot, msg) {
    bot.sendMessage(msg.chat.id, "Please enter the title of the previous year question paper:");
    const title = await getUserInput(bot, msg.chat.id);
    bot.sendMessage(msg.chat.id, "Please select the subject:");
    const subject = await subjectSelection(bot, msg);
    bot.sendMessage(msg.chat.id, "Please enter the year:");
    const year = await getUserInput(bot, msg.chat.id);
    bot.sendMessage(msg.chat.id, "Please send the previous year question paper file:");
    const pyqMsg = await new Promise(resolve => bot.once("document", resolve));
    const pyqFile = pyqMsg.document;
    await axios.post(`${API_URL}/pyq`, {
        qp_title: title,
        subject_code: subject,
        qp_year: year,
        qp_url: pyqFile.file_id
    });
    bot.sendMessage(msg.chat.id, `Previous year question paper '${title}' added successfully.`);
}

async function handleViewPyq(bot, msg) {
    try {
        bot.sendMessage(msg.chat.id, "Please select the subject:");
        const subject = await subjectSelection(bot, msg);
        const pyqsResponse = await axios.get(`${API_URL}/pyq/subject/${subject}`);
        const pyqs = pyqsResponse.data;
        if (pyqs.length === 0) {
            bot.sendMessage(msg.chat.id, "No previous year question papers available for this subject.");
            return;
        }
        const pyqUrlMap = new Map();
        const pyqTitleMap = new Map();
        const pyqButtons = pyqs.map(pyq => {
            const shortId = `pyq_${pyq.qp_id}`;
            pyqUrlMap.set(shortId, pyq.qp_url);
            pyqTitleMap.set(shortId, pyq.qp_title + " - " + pyq.qp_year);
            return [{
                text: pyq.qp_title + " - " + pyq.qp_year,
                callback_data: shortId
            }];
        });
        bot.sendMessage(msg.chat.id, "Select a previous year question paper:", { reply_markup: { inline_keyboard: pyqButtons } });

        while (true) {
            const pyqQuery = await new Promise(resolve => bot.once("callback_query", resolve));
            const pyqId = pyqQuery.data;
            const pyqUrl = pyqUrlMap.get(pyqId);
            const pyqTitle = pyqTitleMap.get(pyqId);

            if (pyqUrl) {
                bot.sendDocument(pyqQuery.message.chat.id, pyqUrl, { caption: pyqTitle });
            }
        }
    } catch (error) {
        bot.sendMessage(msg.chat.id, "No previous year question papers found for this subject. Please try again.");
    }
}

async function subjectSelection(bot, msg) {
    const subjectsResponse = await axios.get(`${API_URL}/subjects`);
    const subjects = subjectsResponse.data;
    const buttons = subjects.map(sub => ([{
        text: sub.subject_name,
        callback_data: sub.subject_code
    }]));
    bot.sendMessage(msg.chat.id, "Select a subject:", { reply_markup: { inline_keyboard: buttons } });
    const subjectQuery = await new Promise(resolve => bot.once("callback_query", resolve));
    return subjectQuery.data;
}

async function handleAddNote(bot, msg) {
    bot.sendMessage(msg.chat.id, "Please enter the title of the note:");
    const title = await getUserInput(bot, msg.chat.id);
    bot.sendMessage(msg.chat.id, "Now, please select the subject:");
    const subject = await subjectSelection(bot, msg);
    bot.sendMessage(msg.chat.id, "Please send the note file:");
    const noteMsg = await new Promise(resolve => bot.once("document", resolve));
    const noteFile = noteMsg.document;
    await axios.post(`${API_URL}/notes`, {
        note_title: title,
        subject_code: subject,
        note_url: noteFile.file_id
    }); 
    bot.sendMessage(msg.chat.id, `Note '${title}' added successfully.`);
}

async function handleViewNotes(bot, msg) {
    try {
        bot.sendMessage(msg.chat.id, "Please select the subject:");
        const subject = await subjectSelection(bot, msg);
        const notesResponse = await axios.get(`${API_URL}/notes/subject/${subject}`);
        const notes = notesResponse.data;
        if (notes.length === 0) {
            bot.sendMessage(msg.chat.id, "No notes available for this subject.");
            return;
        }
        const noteUrlMap = new Map();
        const noteTitleMap = new Map();
        const noteButtons = notes.map(note => {
            const shortId = `note_${note.note_id}`;
            noteUrlMap.set(shortId, note.note_url);
            noteTitleMap.set(shortId, note.note_title);
            return [{
                text: note.note_title,
                callback_data: shortId
            }];
        });
        bot.sendMessage(msg.chat.id, "Select a note:", { reply_markup: { inline_keyboard: noteButtons } });

        while (true) {
            const noteQuery = await new Promise(resolve => bot.once("callback_query", resolve));
            const noteId = noteQuery.data;
            const noteUrl = noteUrlMap.get(noteId);
            const noteTitle = noteTitleMap.get(noteId);

            if (noteUrl) {
                bot.sendDocument(noteQuery.message.chat.id, noteUrl, { caption: noteTitle });
            }
        }
    } catch (error) {
        bot.sendMessage(msg.chat.id, "No notes found for this subject. Please try again.");
    }
}

async function handleAddAssignment(bot, msg) {
    bot.sendMessage(msg.chat.id, "Please enter the title of the assignment:");
    const title = await getUserInput(bot, msg.chat.id);
    bot.sendMessage(msg.chat.id, "Please enter the date of submission (YYYY-MM-DD):");
    const dateOfSubmission = await getUserInput(bot, msg.chat.id);
    bot.sendMessage(msg.chat.id, "Please select the subject:");
    const subject = await subjectSelection(bot, msg);
    await axios.post(`${API_URL}/assignments`, {
        assignment_title: title,
        date_of_submission: dateOfSubmission,
        subject_code: subject
    });
    bot.sendMessage(msg.chat.id, `Assignment '${title}' added successfully.`);
}

async function handlePyqMenu(bot, msg) {
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "/addpyq" }, { text: "/viewpyqs" }],
                [{ text: "/back" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
    bot.sendMessage(msg.chat.id, "PYQ Options:", options);
}

async function handleNotesMenu(bot, msg) {
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "/addnote" }, { text: "/viewnotes" }],
                [{ text: "/back" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
    bot.sendMessage(msg.chat.id, "Notes Options:", options);
}

async function handleSubjectMenu(bot, msg) {
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "/addSubject" }, { text: "/viewSubjects" }],
                [{ text: "/back" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
    bot.sendMessage(msg.chat.id, "Subject Options:", options);
}

function handleBackCommand(bot, msg) {
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "/assignment" }, { text: "/timetable" }],
                [{ text: "/notes" }, { text: "/pyq" }],
                [{ text: "/subject" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
    bot.sendMessage(msg.chat.id, "How can I help you today?", options);
}

module.exports = {
    start: startBot
};