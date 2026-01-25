# AI Task Creator - User Guide

## Overview
The AI Task Creator uses intelligent keyword parsing to automatically create tasks from natural language prompts. Simply describe your tasks naturally, and the AI will extract all the details and add them to the appropriate days.

## How to Use

### 1. Open the AI Task Creator
- Look for the **AI Task Creator** section with the robot icon 🤖
- Click the dropdown button to expand it

### 2. Write Your Prompt
Type your tasks naturally in the text area. The AI understands various formats:

#### Example Prompts:

**Single Task:**
```
Add meeting with team on Monday high priority work category
```

**Multiple Tasks:**
```
Gym workout Tuesday morning health, Study for exam Wednesday high priority, Buy groceries Saturday personal
```

**Using "and":**
```
Complete project report on Thursday and prepare presentation on Friday
```

**Smart Day Recognition:**
```
Meeting today at 3pm work
Doctor appointment tomorrow morning health
Workout this weekend health
```

### 3. Keywords the AI Understands

#### Days:
- **Specific days:** monday, tuesday, wednesday, thursday, friday, saturday, sunday
- **Short forms:** mon, tue, wed, thu, fri, sat, sun
- **Smart keywords:** today, tomorrow, weekend

#### Priority:
- **High:** high, urgent, important, critical, asap
- **Medium:** medium, normal, moderate (default)
- **Low:** low, minor, sometime, later

#### Categories:
- **Work:** work, office, meeting, project, business, client, team
- **Personal:** personal, home, family, errands, shopping, buy
- **Health:** health, gym, workout, exercise, fitness, doctor, medical
- **Study:** study, learn, course, exam, homework, assignment, read, research
- **Other:** (default if no category keyword found)

#### Time Periods:
- **Early Morning:** early morning, dawn, sunrise
- **Morning:** morning, am (default)
- **Afternoon:** afternoon, noon, pm
- **Evening:** evening, night

### 4. Preview and Confirm
- Click "Create Tasks" to see a preview
- Review the parsed tasks with all detected attributes
- Click "Confirm & Add Tasks" to add them to your schedule

## Smart Features

### 🎯 Multiple Days in One Sentence
```
Team standup Monday and Wednesday morning work
```
Creates 2 tasks: one for Monday, one for Wednesday

### 🎯 Weekend Tasks
```
Clean the house on weekend personal
```
Creates tasks for both Saturday and Sunday

### 🎯 Context-Aware Parsing
The AI removes keywords from the task title, so:
```
Important meeting with client on Monday high priority work
```
Results in:
- **Title:** "Meeting with client"
- **Day:** Monday
- **Priority:** High
- **Category:** Work

### 🎯 Auto-Capitalization
Task titles are automatically capitalized for consistency

## Tips for Best Results

1. **Always mention the day** - The AI needs to know when to schedule the task
2. **Be specific but natural** - Write as you would normally speak
3. **Use multiple sentences** - For complex schedules, separate with commas or "and"
4. **Review the preview** - Always check before confirming

## Example Use Cases

### Planning Your Week:
```
Team meeting Monday morning work high priority
Gym Tuesday and Thursday health
Study session Wednesday evening study
Client call Friday afternoon work important
Grocery shopping Saturday morning personal
Meal prep Sunday afternoon personal
```

### Quick Daily Tasks:
```
Send report today work urgent
Call dentist tomorrow morning health
Review code today afternoon work
```

### Project Planning:
```
Research phase Monday and Tuesday study
Development Wednesday through Friday work high priority
Testing and review next weekend work
```

## Troubleshooting

**"Could not understand the prompt"**
- Make sure you included at least one day keyword
- Check spelling of day names

**Task title looks wrong**
- The AI removes detected keywords
- You can edit the task after creation if needed

**Priority/Category not detected**
- Add explicit keywords like "high priority" or "work category"
- Or edit the task after creation

## Advanced Usage

### Batch Creation
You can create multiple tasks at once:
```
Monday: team standup work, code review afternoon work
Tuesday: gym morning health, client meeting afternoon work important  
Wednesday: study session evening study, dinner with family personal
```

### Smart Defaults
If you don't specify:
- Priority defaults to "medium"
- Category defaults to "other"
- Time period defaults to "morning"

---

**Enjoy your AI-powered task management! 🚀**
