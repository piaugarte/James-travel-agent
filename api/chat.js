const Anthropic = require("@anthropic-ai/sdk");
const { createClient } = require("@supabase/supabase-js");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const TRIP_ID = "a1b2c3d4-0000-0000-0000-000000000001";

  const tools = [
    {
      name: "get_trip_data",
      description: "Fetch the full current trip data including all days, items, and packing list. Always call this first before making any changes so you know what exists.",
      input_schema: { type: "object", properties: {}, required: [] }
    },
    {
      name: "add_itinerary_item",
      description: "Add a new activity or item to a specific day",
      input_schema: {
        type: "object",
        properties: {
          day_id: { type: "string", description: "The UUID of the day to add the item to" },
          time: { type: "string", description: "Time of the activity e.g. 10:00 AM" },
          activity: { type: "string", description: "Name or description of the activity" },
          location: { type: "string", description: "Location or venue" },
          cost: { type: "number", description: "Estimated cost in CAD" },
          category: { type: "string", enum: ["activity", "food", "hotel", "transport", "flight", "other"] }
        },
        required: ["day_id", "activity"]
      }
    },
    {
      name: "update_itinerary_item",
      description: "Update an existing itinerary item by its ID",
      input_schema: {
        type: "object",
        properties: {
          item_id: { type: "string", description: "The UUID of the item to update" },
          time: { type: "string" },
          activity: { type: "string" },
          location: { type: "string" },
          cost: { type: "number" },
          category: { type: "string", enum: ["activity", "food", "hotel", "transport", "flight", "other"] },
          confirmed: { type: "boolean" }
        },
        required: ["item_id"]
      }
    },
    {
      name: "delete_itinerary_item",
      description: "Delete an itinerary item by its ID",
      input_schema: {
        type: "object",
        properties: {
          item_id: { type: "string", description: "The UUID of the item to delete" }
        },
        required: ["item_id"]
      }
    },
    {
      name: "update_day_notes",
      description: "Update the notes for a specific day",
      input_schema: {
        type: "object",
        properties: {
          day_id: { type: "string", description: "The UUID of the day" },
          notes: { type: "string", description: "The new notes text" }
        },
        required: ["day_id", "notes"]
      }
    },
    {
      name: "update_day_title",
      description: "Update the title of a specific day",
      input_schema: {
        type: "object",
        properties: {
          day_id: { type: "string", description: "The UUID of the day" },
          title: { type: "string", description: "The new title for the day" }
        },
        required: ["day_id", "title"]
      }
    },
    {
      name: "add_packing_item",
      description: "Add a new item to the packing list",
      input_schema: {
        type: "object",
        properties: {
          item: { type: "string", description: "Name of the item to pack" },
          category: { type: "string", enum: ["documents", "clothing", "health", "gear", "tech", "food", "other"] }
        },
        required: ["item", "category"]
      }
    },
    {
      name: "delete_packing_item",
      description: "Remove an item from the packing list by its ID",
      input_schema: {
        type: "object",
        properties: {
          item_id: { type: "string", description: "The UUID of the packing item to remove" }
        },
        required: ["item_id"]
      }
    },
    {
      name: "update_trip_budget",
      description: "Update the total trip budget amount",
      input_schema: {
        type: "object",
        properties: {
          total_budget: { type: "number", description: "New total budget in CAD" }
        },
        required: ["total_budget"]
      }
    }
  ];

  async function runTool(name, input) {
    if (name === "get_trip_data") {
      const [daysRes, itemsRes, packRes] = await Promise.all([
        sb.from("itinerary_days").select("*").eq("trip_id", TRIP_ID).order("day_number"),
        sb.from("itinerary_items").select("*").order("sort_order"),
        sb.from("packing_items").select("*").eq("trip_id", TRIP_ID)
      ]);
      return { days: daysRes.data || [], items: itemsRes.data || [], packing: packRes.data || [] };
    }

    if (name === "add_itinerary_item") {
      const existingRes = await sb.from("itinerary_items").select("sort_order").eq("day_id", input.day_id).order("sort_order", { ascending: false }).limit(1);
      const sort_order = existingRes.data && existingRes.data.length > 0 ? existingRes.data[0].sort_order + 1 : 1;
      const { data, error } = await sb.from("itinerary_items").insert({
        day_id: input.day_id,
        time: input.time || "",
        activity: input.activity,
        location: input.location || "",
        cost: input.cost || 0,
        category: input.category || "activity",
        confirmed: false,
        sort_order
      }).select().single();
      if (error) return { error: error.message };
      return { success: true, item: data };
    }

    if (name === "update_itinerary_item") {
      const updates = {};
      if (input.time !== undefined) updates.time = input.time;
      if (input.activity !== undefined) updates.activity = input.activity;
      if (input.location !== undefined) updates.location = input.location;
      if (input.cost !== undefined) updates.cost = input.cost;
      if (input.category !== undefined) updates.category = input.category;
      if (input.confirmed !== undefined) updates.confirmed = input.confirmed;
      const { error } = await sb.from("itinerary_items").update(updates).eq("id", input.item_id);
      if (error) return { error: error.message };
      return { success: true };
    }

    if (name === "delete_itinerary_item") {
      const { error } = await sb.from("itinerary_items").delete().eq("id", input.item_id);
      if (error) return { error: error.message };
      return { success: true };
    }

    if (name === "update_day_notes") {
      const { error } = await sb.from("itinerary_days").update({ notes: input.notes, updated_at: new Date().toISOString() }).eq("id", input.day_id);
      if (error) return { error: error.message };
      return { success: true };
    }

    if (name === "update_day_title") {
      const { error } = await sb.from("itinerary_days").update({ title: input.title, updated_at: new Date().toISOString() }).eq("id", input.day_id);
      if (error) return { error: error.message };
      return { success: true };
    }

    if (name === "add_packing_item") {
      const { data, error } = await sb.from("packing_items").insert({
        trip_id: TRIP_ID,
        item: input.item,
        category: input.category,
        packed: false
      }).select().single();
      if (error) return { error: error.message };
      return { success: true, item: data };
    }

    if (name === "delete_packing_item") {
      const { error } = await sb.from("packing_items").delete().eq("id", input.item_id);
      if (error) return { error: error.message };
      return { success: true };
    }

    if (name === "update_trip_budget") {
      const { error } = await sb.from("trip").update({ total_budget: input.total_budget }).eq("id", TRIP_ID);
      if (error) return { error: error.message };
      return { success: true };
    }

    return { error: "Unknown tool: " + name };
  }

  try {
    const { messages, tripContext } = req.body;

    const systemPrompt = `You are a warm, enthusiastic personal trip planning assistant helping Pia and her family plan their Vancouver trip (June 15 - July 1, 2026).

You have tools to READ and WRITE to the trip database. You can add, update, and delete itinerary items, update day notes and titles, manage the packing list, and update the budget.

When someone asks you to make a change:
1. Call get_trip_data first to get current IDs and see what exists
2. Make the change using the appropriate tool
3. Confirm what you did in a friendly, specific way

Current trip context:
${tripContext || "No context provided."}

Guidelines:
- Be warm and enthusiastic - this is a special family trip!
- When making changes, be specific in your confirmation (e.g. Done! I added a 7pm dinner at Miku Restaurant on Day 6 for CA$150 under Food.)
- Never use em dashes - use plain hyphens instead
- Keep responses concise and use bullet points for suggestions`;

    let currentMessages = messages.map(m => ({ role: m.role, content: m.content }));
    let madeChanges = false;

    for (let i = 0; i < 10; i++) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        tools: tools,
        messages: currentMessages
      });

      if (response.stop_reason === "end_turn") {
        const text = response.content.find(b => b.type === "text");
        return res.status(200).json({ reply: text ? text.text : "Done!", madeChanges });
      }

      if (response.stop_reason === "tool_use") {
        const toolUses = response.content.filter(b => b.type === "tool_use");
        const toolResults = [];
        for (const toolUse of toolUses) {
          const result = await runTool(toolUse.name, toolUse.input);
          if (toolUse.name !== "get_trip_data" && result.success) madeChanges = true;
          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) });
        }
        currentMessages = [
          ...currentMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults }
        ];
      } else {
        const text = response.content.find(b => b.type === "text");
        return res.status(200).json({ reply: text ? text.text : "Done!", madeChanges });
      }
    }

    return res.status(200).json({ reply: "Done!", madeChanges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
