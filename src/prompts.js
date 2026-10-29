// Ready-made questions the dashboard and grade book send to the chat.
export const P = {
  cls: 'Analyse my class grades. Give the overall picture, who is excelling, who needs help and why, any subject problems or patterns, and 3 concrete actions I should take this week.',
  help: 'Which students need the most help right now and why? Suggest one specific support step for each of them.',
  plan: 'Using my grade book, make a one-week revision plan that raises the weakest subject. Show it day by day.',
  student: (n) => `Analyse ${n}'s grades. Cover strengths, weaknesses and the trend over time, then give 3 specific study actions.`,
  subject: (s, days) => `Make a ${days}-day study plan to improve ${s}. Use my grade book to say which students and topics to focus on.`,
}
