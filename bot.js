const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_IDS = process.env.ADMIN_IDS.split(',').map(id => parseInt(id));
const API_URL = process.env.API_URL;
const { format } = require('date-fns');
const { text } = require('express');

async function startBot() {
    const bot = new TelegramBot(TOKEN, { polling: true });
    console.log('Bot is starting');

    bot.onText(/\/start/, async (msg) => {
        await handleStartCommand(bot, msg);
    });


    bot.onText(/\/assignment/, async (msg) => {
       if (ADMIN_IDS.includes(msg.from.id)) {
           await handleAdminCommand(bot, msg, handleAssignmentMenu);
       }
       else {
           await handleAssignmentCommand(bot, msg);
       }
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

    bot.onText(/\/viewpyqs/, async (msg) => {
        await handleViewPyq(bot, msg);
    });

    bot.onText(/\/viewnotes/, async (msg) => {
        await handleViewNotes(bot, msg);
    });

    bot.onText(/\/viewSubjects/, async (msg) => {
        await handleSubjectCommand(bot, msg);
    });

    bot.onText(/\/viewassignments/, async (msg) => {
        console.log("View assignments");
        await handleAssignmentCommand(bot, msg);
    });

    bot.onText(/\/deletepyq/, async (msg) => {
        await handleAdminCommand(bot, msg, handleDeletePyq);
    });

    bot.onText(/\/deleteNote/, async (msg) => {
        await handleAdminCommand(bot, msg, handleDeleteNote);
    });

    bot.onText(/\/deleteSubject/, async (msg) => {
        await handleAdminCommand(bot, msg, handleDeleteSubject);
    });

    bot.onText(/\/deleteassignment/, async (msg) => {
        await handleAdminCommand(bot, msg, handleDeleteAssignment);
    });

    bot.onText(/\/updatepyq/, async (msg) => {
        await handleAdminCommand(bot, msg, handleUpdatePyq);
    });

    bot.onText(/\/updateSubject/, async (msg) => {
        await handleAdminCommand(bot, msg, handleUpdateSubject);
    });

    bot.onText(/\/updateassignment/, async (msg) => {
        await handleAdminCommand(bot,msg,handleUpdateAssignment);
    });

    bot.onText(/\/updatenote/, async (msg) => {
        await handleAdminCommand(bot,msg,handleUpdateNote);
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
                [{ text: "/assignment" }],
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
    try {
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
    } catch(error) {
        console.error("Error adding subject:", error);
        bot.sendMessage(msg.chat.id, error.response.data.message || "Failed to add subject. Please try again.");
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
        bot.sendMessage(msg.chat.id, error.response.data.message || "Failed to fetch subjects. Please try again.");
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
        bot.sendMessage(msg.chat.id, error.response.data.message || "Failed to fetch assignments. Please try again.");
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
        await handleWelcomeMessage(bot, { chat: { id } });
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
        const subject = await subjectSelection(bot, msg);
        if (!subject)
        {
            bot.sendMessage(msg.chat.id,"No subjects found");
            return;
        }
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
        bot.sendMessage(msg.chat.id, "No previous year question papers found for this subject.");
    }
}

async function subjectSelection(bot, msg) {
    try{    
        const subjectsResponse = await axios.get(`${API_URL}/subjects`);
        const subjects = subjectsResponse.data;
        const buttons = subjects.map(sub => ([{
            text: sub.subject_name,
            callback_data: sub.subject_code
        }]));
        bot.sendMessage(msg.chat.id, "Select a subject:", { reply_markup: { inline_keyboard: buttons } });
        const subjectQuery = await new Promise(resolve => bot.once("callback_query", resolve));
        const selectedSubject = subjects.find(sub => sub.subject_code === subjectQuery.data);
        bot.editMessageText(`Subject selected: ${selectedSubject.subject_name}`, {
            chat_id: subjectQuery.message.chat.id,
            message_id: subjectQuery.message.message_id
        });
        return subjectQuery.data;
    } catch (error)
    {
        console.log("Error in subject selection:", error);
        return null;
    }
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

        // Remove any existing callback_query listeners to prevent multiple responses
        bot.removeAllListeners("callback_query");

        const callbackQueryListener = async (noteQuery) => {
            const noteId = noteQuery.data;
            const noteUrl = noteUrlMap.get(noteId);
            const noteTitle = noteTitleMap.get(noteId);

            if (noteUrl) {
                await bot.sendDocument(noteQuery.message.chat.id, noteUrl, { caption: noteTitle });
            }

            // Remove the listener after handling the query
            bot.removeListener("callback_query", callbackQueryListener);
        };

        bot.on("callback_query", callbackQueryListener);
    } catch (error) {
        console.error("Error in handleViewNotes:", error);
        bot.sendMessage(msg.chat.id, error.response.data.message || "Failed to fetch notes. Please try again.");
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
                [{ text: "/deletepyq" }, { text: "/updatepyq" }],
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
                [{ text: "/deleteNote" },{text: "/updatenote"}],
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
                [{ text: "/deleteSubject" },{ text: "/updateSubject" }],
                [{ text: "/back" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
    bot.sendMessage(msg.chat.id, "Subject Options:", options);
}

async function handleAssignmentMenu(bot, msg) {
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "/addassignment" }, { text: "/viewassignments" }],
                [{ text: "/deleteassignment" },{text:"/updateassignment"}],
                [{ text: "/back" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
    bot.sendMessage(msg.chat.id, "Assignment Options:", options);
}

function handleBackCommand(bot, msg) {
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "/assignment" }],
                [{ text: "/notes" }, { text: "/pyq" }],
                [{ text: "/subject" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
    bot.sendMessage(msg.chat.id, "What would you like to do next?", options); 
}

async function handleDeletePyq(bot, msg) {
    try {
        const response = await axios.get(`${API_URL}/pyq`);
        const pyqs = response.data;
        if (pyqs.length === 0) {
            bot.sendMessage(msg.chat.id, "No previous year question papers available for deletion.");
            return;
        }
        const options = {
            reply_markup: {
                keyboard: pyqs.map(pyq => ([{ text: pyq.qp_title }])),
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };
        bot.sendMessage(msg.chat.id, "Select a previous year question paper to delete:", options);
        const pyqToDelete = await getUserInput(bot, msg.chat.id);
        const pyq = pyqs.find(pyq => pyq.qp_title === pyqToDelete);
        if (!pyq) {
            bot.sendMessage(msg.chat.id, "Invalid previous year question paper. Please try again.");
            return;
        }
        await axios.delete(`${API_URL}/pyq/${pyq.qp_id}`);
        bot.sendMessage(msg.chat.id, `Previous year question paper '${pyqToDelete}' deleted successfully.`);
        handleBackCommand(bot, msg);
    }
    catch (error) {
        console.error("Error deleting previous year question paper:", error);
        bot.sendMessage(msg.chat.id, error.response.data.message || "Failed to delete previous year question paper. Please try again.");
    }
}

async function handleDeleteNote(bot, msg) {
    try {
        const response = await axios.get(`${API_URL}/notes`);
        const notes = response.data;
        if (notes.length === 0) {
            bot.sendMessage(msg.chat.id, "No notes available for deletion.");
            return;
        }
        const options = {
            reply_markup: {
                keyboard: notes.map(note => ([{ text: note.note_title }])),
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };
        bot.sendMessage(msg.chat.id, "Select a note to delete:", options);
        const noteToDelete = await getUserInput(bot, msg.chat.id);
        const note = notes.find(note => note.note_title === noteToDelete);
        if (!note) {
            bot.sendMessage(msg.chat.id, "Invalid note. Please try again.");
            return;
        }
        await axios.delete(`${API_URL}/notes/${note.note_id}`);
        bot.sendMessage(msg.chat.id, `Note '${noteToDelete}' deleted successfully.`);
        handleBackCommand(bot, msg);
    }
    catch (error) {
        console.error("Error deleting note:", error);
        bot.sendMessage(msg.chat.id, error.response.data.message || "Failed to delete note. Please try again.");
    }
}

async function handleDeleteSubject(bot, msg) {
    try {
        const response = await axios.get(`${API_URL}/subjects`);
        const subjects = response.data;
        if (subjects.length === 0) {
            bot.sendMessage(msg.chat.id, "No subjects available for deletion.");
            return;
        }
        const options = {
            reply_markup: {
                keyboard: subjects.map(sub => ([{ text: sub.subject_name }])),
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };
        bot.sendMessage(msg.chat.id, "Select a subject to delete:", options);
        const subjectToDelete = await getUserInput(bot, msg.chat.id);
        const subject = subjects.find(sub => sub.subject_name === subjectToDelete);
        if (!subject) {
            bot.sendMessage(msg.chat.id, "Invalid subject. Please try again.");
            return;
        }
        await axios.delete(`${API_URL}/subjects/${subject.subject_code}`);
        bot.sendMessage(msg.chat.id, `Subject '${subjectToDelete}' deleted successfully.`);
        handleBackCommand(bot, msg);
    }
    catch (error) {
        console.error("Error deleting subject:", error);
        bot.sendMessage(msg.chat.id, error.response.data.message || "Failed to delete subject. Please try again.");
    }
}

async function handleDeleteAssignment(bot, msg) {
    try {
        const response = await axios.get(`${API_URL}/assignments`);
        const assignments = response.data;
        if (assignments.length === 0) {
            bot.sendMessage(msg.chat.id, "No assignments available for deletion.");
            return;
        }
        const options = {
            reply_markup: {
                keyboard: assignments.map(assignment => ([{ text: assignment.assignment_title }])),
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };
        bot.sendMessage(msg.chat.id, "Select an assignment to delete:", options);
        const assignmentToDelete = await getUserInput(bot, msg.chat.id);
        const assignment = assignments.find(assignment => assignment.assignment_title === assignmentToDelete);
        if (!assignment) {
            bot.sendMessage(msg.chat.id, "Invalid assignment. Please try again.");
            return;
        }
        await axios.delete(`${API_URL}/assignments/${assignment.assignment_id}`);
        bot.sendMessage(msg.chat.id, `Assignment '${assignmentToDelete}' deleted successfully.`);
        handleBackCommand(bot, msg);
    }
    catch (error) {
        console.error("Error deleting assignment:", error);
        if (error.response && error.response.status === 404) {
            bot.sendMessage(msg.chat.id, "Assignment not found. Please try again.");
        } else {
            bot.sendMessage(msg.chat.id, error.response.data.message || "Failed to delete assignment. Please try again.");
        }
    }
}

async function handleUpdatePyq(bot, msg) {
    try {
        const response = await axios.get(`${API_URL}/pyq`);
        const pyqs = response.data;
        if (pyqs.length === 0) {
            bot.sendMessage(msg.chat.id, "No previous year question papers available for update.");
            return;
        }
        const options = {
            reply_markup: {
                keyboard: pyqs.map(pyq => ([{ text: pyq.qp_title }])),
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };
        bot.sendMessage(msg.chat.id, "Select a previous year question paper to update:", options);
        const pyqToUpdate = await getUserInput(bot, msg.chat.id);
        const pyq = pyqs.find(pyq => pyq.qp_title === pyqToUpdate);
        if (!pyq) {
            bot.sendMessage(msg.chat.id, "Invalid previous year question paper. Please try again.");
            return;
        }
        bot.sendMessage(msg.chat.id, "Please enter the new title of the previous year question paper:");
        const newTitle = await getUserInput(bot, msg.chat.id);
        bot.sendMessage(msg.chat.id, "Please enter the new year:");
        const newYear = await getUserInput(bot, msg.chat.id);
        await axios.patch(`${API_URL}/pyq/${pyq.qp_id}`, {
            qp_title: newTitle,
            qp_year: newYear
        });
        bot.sendMessage(msg.chat.id, `Previous year question paper '${pyqToUpdate}' updated successfully.`);
        handleBackCommand(bot, msg);
    }
    catch (error) {
        console.error("Error updating previous year question paper:", error);
        bot.sendMessage(msg.chat.id, error.response.data.message || "Failed to update previous year question paper. Please try again.");
    }
}

async function handleUpdateSubject(bot, msg) {
    try {
        const response = await axios.get(`${API_URL}/subjects`);
        const subjects = response.data;
        if (subjects.length === 0) {
            bot.sendMessage(msg.chat.id, "No subjects available for update.");
            return;
        }
        const options = {
            reply_markup: {
                keyboard: subjects.map(sub => ([{ text: sub.subject_name }])),
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };
        bot.sendMessage(msg.chat.id, "Select a subject to update:", options);
        const subjectToUpdate = await getUserInput(bot, msg.chat.id);
        const subject = subjects.find(sub => sub.subject_name === subjectToUpdate);
        if (!subject) {
            bot.sendMessage(msg.chat.id, "Invalid subject. Please try again.");
            return;
        }
        bot.sendMessage(msg.chat.id, "Please enter the new subject name:");
        const newName = await getUserInput(bot, msg.chat.id);
        bot.sendMessage(msg.chat.id, "Please enter the new subject credits:");
        const newCredits = await getUserInput(bot, msg.chat.id);
        await axios.patch(`${API_URL}/subjects/${subject.subject_code}`, {
            subject_name: newName,
            credits: newCredits
        });
        bot.sendMessage(msg.chat.id, `Subject '${subjectToUpdate}' updated successfully.`);
        handleBackCommand(bot, msg);
    }
    catch (error) {
        console.error("Error updating subject:", error);
        bot.sendMessage(msg.chat.id, error.response.data.message || "Failed to update subject. Please try again.");
    }
}

async function handleUpdateAssignment(bot, msg) {
    try {
        const response = await axios.get(`${API_URL}/assignments`);
        const assignments = response.data;
        if (assignments.length === 0) {
            bot.sendMessage(msg.chat.id, "No assignments available for update.");
            return;
        }
        const options = {
            reply_markup: {
                keyboard: assignments.map(assignment => ([{ text: assignment.assignment_title }])),
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };
        bot.sendMessage(msg.chat.id, "Select an assignment to update:", options);
        const assignmentToUpdate = await getUserInput(bot, msg.chat.id);
        const assignment = assignments.find(assignment => assignment.assignment_title === assignmentToUpdate);
        if (!assignment) {
            bot.sendMessage(msg.chat.id, "Invalid assignment. Please try again.");
            return;
        }
        bot.sendMessage(msg.chat.id, "Please enter the new title of the assignment:");
        const newTitle = await getUserInput(bot, msg.chat.id);
        bot.sendMessage(msg.chat.id, "Please enter the new date of submission (YYYY-MM-DD):");
        const newDateOfSubmission = await getUserInput(bot, msg.chat.id);
        await axios.patch(`${API_URL}/assignments/${assignment.assignment_id}`, {
            assignment_title: newTitle,
            date_of_submission: newDateOfSubmission
        });
        bot.sendMessage(msg.chat.id, `Assignment '${assignmentToUpdate}' updated successfully.`);
        handleBackCommand(bot, msg);
    } catch (error) {
        console.error("Error updating assignment:", error);
        bot.sendMessage(msg.chat.id, error.response.data.message || "Failed to update assignment. Please try again.");
    }
}

async function handleUpdateNote(bot, msg) {
    try {
        const response = await axios.get(`${API_URL}/notes`);
        const notes = response.data;
        if (notes.length === 0) {
            bot.sendMessage(msg.chat.id, "No notes available for update.");
            return;
        }
        const options = {
            reply_markup: {
                keyboard: notes.map(note => ([{ text: note.note_title }])),
                resize_keyboard: true,
                one_time_keyboard: true
            }
        };
        bot.sendMessage(msg.chat.id, "Select a note to update:", options);
        const noteToUpdate = await getUserInput(bot, msg.chat.id);
        const note = notes.find(note => note.note_title === noteToUpdate);
        if (!note) {
            bot.sendMessage(msg.chat.id, "Invalid note. Please try again.");
            return;
        }
        bot.sendMessage(msg.chat.id, "Please enter the new title of the note:");
        const newTitle = await getUserInput(bot, msg.chat.id);
        bot.sendMessage(msg.chat.id, "Please enter the new subject code of the note:");
        const newSubjectCode = await getUserInput(bot, msg.chat.id);
        await axios.patch(`${API_URL}/notes/${note.note_id}`, {
            note_title: newTitle,
            subject_code: newSubjectCode
        });
        bot.sendMessage(msg.chat.id, `Note '${noteToUpdate}' updated successfully.`);
        handleBackCommand(bot, msg);
    } catch (error) {
        console.error("Error updating note:", error);
        bot.sendMessage(msg.chat.id, error.response?.data?.message || "Failed to update note. Please try again.");
    }
}

module.exports = {
    start: startBot
};