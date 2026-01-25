# ChatGPT Integration Workflow

## Using ChatGPT to Generate Multiple Tasks

### Method 1: Quick Start

1. **Open the AI Chat** (click the floating robot icon)
2. **Switch to Multi-Task JSON mode** (click the "Multi-Task JSON" button)
3. **Click "Get JSON Template"**
4. **Copy the template** (click "Copy Template" button)
5. **Go to ChatGPT** and paste the template
6. **Ask ChatGPT to fill it**:
   ```
   Fill this JSON with my tasks for next week:
   - Monday: Team meeting at 9am (important work)
   - Tuesday and Thursday: Gym workout in the evening
   - Wednesday: Study React for 2 hours
   - Friday: Code review meeting
   - Saturday: Grocery shopping
   - Sunday: Meal prep for the week
   ```
7. **Copy ChatGPT's response** (the filled JSON)
8. **Paste it back** into the AI chat
9. **Click Send** - all tasks are added automatically!

---

## Example ChatGPT Prompts

### Example 1: Work Week
```
Fill this JSON template with these work tasks:
- Monday morning: Sprint planning meeting (high priority, work)
- Tuesday afternoon: Client presentation (high priority, work)
- Wednesday all day: Development work (medium priority, work)
- Thursday morning: Code review (medium priority, work)
- Friday afternoon: Team retrospective (low priority, work)
```

### Example 2: Fitness & Health
```
Add these health tasks to the JSON:
- Monday, Wednesday, Friday mornings: Gym workout
- Tuesday evening: Yoga class
- Thursday morning: Running
- Saturday morning: Meal prep
- Sunday afternoon: Rest and recovery
Make them all health category, medium priority
```

### Example 3: Study Schedule
```
Create a study schedule in JSON format:
- Monday evening: Read Chapter 1-3 (study, high priority)
- Tuesday evening: Practice coding exercises (study, high priority)
- Wednesday evening: Watch tutorial videos (study, medium)
- Thursday evening: Review notes (study, low)
- Weekend: Personal projects (study, medium)
```

### Example 4: Balanced Week
```
Fill the JSON with a balanced weekly schedule:
Work tasks:
- Monday 9am: Team standup (high priority)
- Wednesday 2pm: Project review (medium)
- Friday morning: Sprint demo (high)

Personal tasks:
- Tuesday evening: Grocery shopping (low)
- Saturday morning: House cleaning (medium)

Health tasks:
- Monday, Wednesday, Friday mornings: Workout (medium)
- Sunday: Meal planning (low)
```

---

## Expected JSON Format from ChatGPT

ChatGPT should return something like this:

```json
{
  "tasks": [
    {
      "title": "Team standup meeting",
      "day": "monday",
      "priority": "high",
      "category": "work",
      "period": "morning"
    },
    {
      "title": "Gym workout session",
      "day": "tuesday",
      "priority": "medium",
      "category": "health",
      "period": "evening"
    },
    {
      "title": "Study JavaScript fundamentals",
      "day": "wednesday",
      "priority": "high",
      "category": "study",
      "period": "afternoon"
    }
  ]
}
```

---

## Valid Values Reference

### Days
- `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`

### Priority
- `high` - Urgent/Important tasks
- `medium` - Normal tasks
- `low` - Can be done later (default if not specified)

### Category
- `work` - Work, office, meetings, projects
- `personal` - Home, family, errands
- `health` - Gym, workout, doctor, fitness
- `study` - Learning, courses, homework
- `other` - Everything else (default)

### Period (Time of Day)
- `early-morning` - Before 8am
- `morning` - 8am - 12pm (default)
- `afternoon` - 12pm - 6pm
- `evening` - After 6pm

---

## Tips for Better Results

### 1. Be Specific with ChatGPT
❌ Bad: "Add some tasks"
✅ Good: "Add these specific tasks with their days and priorities"

### 2. Use Clear Day References
❌ Bad: "Next Monday"
✅ Good: Just "Monday" (the app works with weekly recurring tasks)

### 3. Group Similar Tasks
```
Fill this JSON with 3 gym sessions on Monday, Wednesday, Friday mornings
all health category, medium priority
```

### 4. Specify Defaults
```
All tasks should be work category and high priority unless mentioned otherwise
```

### 5. Copy Complete JSON
- Make sure to copy the entire JSON response from ChatGPT
- Include the opening `{` and closing `}`
- Don't edit the JSON manually unless you know the format

---

## Validation Features

The app automatically:
- ✅ Validates JSON format
- ✅ Checks for required fields (title, day)
- ✅ Validates day names
- ✅ Sets defaults for missing priority/category/period
- ✅ Shows errors for invalid tasks
- ✅ Still adds valid tasks even if some are invalid

---

## Advanced: Mixing Both Modes

You can switch between modes:
- **Single Task Mode**: Quick one-off tasks via chat
- **Multi-Task JSON**: Bulk import from ChatGPT

Perfect workflow:
1. Use **Multi-Task JSON** to set up your weekly structure
2. Use **Single Task** mode to add quick tasks throughout the week

---

## Troubleshooting

**"Invalid JSON format"**
- Make sure you copied the complete JSON from ChatGPT
- Check that all brackets `{}` and `[]` are matched
- Click "Validate JSON" before sending

**"No tasks found"**
- Ensure the JSON has a "tasks" array
- Check the JSON structure matches the template

**"Invalid day"**
- Day names must be lowercase: monday, tuesday, etc.
- No abbreviations in JSON (use full day names)

**"Missing title/day"**
- Every task needs at least a title and day
- ChatGPT should include these by default

---

## Quick Reference Card

### ChatGPT Prompt Template:
```
Fill this JSON with tasks:
[paste template]

My tasks:
- [Day] [time]: [Task description] ([priority] [category])
```

### Paste Location:
AI Chat Window → Multi-Task JSON mode → Input area

### Workflow:
Template → ChatGPT → Fill → Copy → Paste → Send → Done! ✨

---

**Happy task planning! 🚀**
