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
      description: "Fetch the full current trip data including all days, items, travelers, and budget. Always call this first.",
      input_schema: { type: "object", properties: {}, required: [] }
    },
    {
      name: "add_itinerary_item",
      description: "Add a new activity, meal, hotel or item to a specific day in the itinerary",
      input_schema: {
        type: "object",
        properties: {
          day_id: { type: "string", description: "UUID of the day" },
          time: { type: "string", description: "Time e.g. 10:00" },
          end_time: { type: "string", description: "End time e.g. 12:00" },
          activity: { type: "string", description: "Name of the activity" },
          location: { type: "string", description: "Venue or address" },
          cost: { type: "number", description: "Estimated cost in USD" },
          category: { type: "string", enum: ["flight", "accommodation", "food", "activity", "transport", "other"] },
          notes: { type: "string", description: "Any extra notes" }
        },
        required: ["day_id", "activity"]
      }
    },
    {
      name: "add_multiple_items",
      description: "Add multiple activities to the itinerary at once. Use this when filling multiple days or adding a full day plan.",
      input_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day_id: { type: "string" },
                time: { type: "string" },
                end_time: { type: "string" },
                activity: { type: "string" },
                location: { type: "string" },
                cost: { type: "number" },
                category: { type: "string", enum: ["flight", "accommodation", "food", "activity", "transport", "other"] },
                notes: { type: "string" }
              },
              required: ["day_id", "activity"]
            }
          }
        },
        required: ["items"]
      }
    },
    {
      name: "update_itinerary_item",
      description: "Update an existing itinerary item",
      input_schema: {
        type: "object",
        properties: {
          item_id: { type: "string" },
          time: { type: "string" },
          end_time: { type: "string" },
          activity: { type: "string" },
          location: { type: "string" },
          cost: { type: "number" },
          category: { type: "string", enum: ["flight", "accommodation", "food", "activity", "transport", "other"] },
          notes: { type: "string" },
          confirmed: { type: "boolean" }
        },
        required: ["item_id"]
      }
    },
    {
      name: "delete_itinerary_item",
      description: "Delete an itinerary item",
      input_schema: {
        type: "object",
        properties: { item_id: { type: "string" } },
        required: ["item_id"]
      }
    },
    {
      name: "update_day_title",
      description: "Set a theme or title for a day e.g. 'Stanley Park Day' or 'Whistler Adventure'",
      input_schema: {
        type: "object",
        properties: {
          day_id: { type: "string" },
          title: { type: "string" }
        },
        required: ["day_id", "title"]
      }
    },
    {
      name: "update_day_notes",
      description: "Add notes or reminders to a day",
      input_schema: {
        type: "object",
        properties: {
          day_id: { type: "string" },
          notes: { type: "string" }
        },
        required: ["day_id", "notes"]
      }
    },
    {
      name: "add_packing_item",
      description: "Add an item to the packing list",
      input_schema: {
        type: "object",
        properties: {
          item: { type: "string" },
          category: { type: "string", enum: ["documents", "clothing", "health", "gear", "tech", "food", "other"] }
        },
        required: ["item", "category"]
      }
    },
    {
      name: "suggest_activities",
      description: "Generate structured activity or hotel suggestions that will be shown as clickable cards in the UI. Use this when the user wants ideas or when proactively suggesting things for empty days.",
      input_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["activity", "restaurant", "hotel", "day_trip"] },
                name: { type: "string", description: "Name of the place or activity" },
                description: { type: "string", description: "2-3 sentence description, mention kid-friendliness" },
                location: { type: "string", description: "Address or neighborhood" },
                cost_per_person: { type: "number", description: "Estimated cost per person in USD" },
                cost_total: { type: "number", description: "Total estimated cost for the family in USD" },
                duration_hours: { type: "number", description: "How many hours this takes" },
                best_time: { type: "string", description: "e.g. Morning, Afternoon, Full day" },
                kid_rating: { type: "number", description: "Kid-friendliness 1-5, 5 being best for kids" },
                suggested_day_id: { type: "string", description: "UUID of the day this fits best, if applicable" },
                suggested_day_number: { type: "number", description: "Day number this fits best" },
                category: { type: "string", enum: ["activity", "food", "hotel", "transport", "other"] },
                book_in_advance: { type: "boolean", description: "Should this be booked ahead?" },
                url: { type: "string", description: "Website URL if known" }
              },
              required: ["type", "name", "description", "cost_total", "category"]
            }
          },
          context: { type: "string", description: "Brief explanation of why you're suggesting these" }
        },
        required: ["suggestions"]
      }
    }
  ];

  async function runTool(name, input) {
    if (name === "get_trip_data") {
      const [tripRes, daysRes, itemsRes, travelersRes] = await Promise.all([
        sb.from("trip").select("*").eq("id", TRIP_ID).single(),
        sb.from("itinerary_days").select("*").eq("trip_id", TRIP_ID).order("day_number"),
        sb.from("itinerary_items").select("*").order("sort_order"),
        sb.from("travelers").select("*").eq("trip_id", TRIP_ID).order("sort_order")
      ]);
      const days = daysRes.data || [];
      const items = itemsRes.data || [];
      // annotate empty days
      const annotated = days.map(d => ({
        ...d,
        items: items.filter(i => i.day_id === d.id),
        isEmpty: items.filter(i => i.day_id === d.id).length === 0
      }));
      const emptyDays = annotated.filter(d => d.isEmpty).map(d => `Day ${d.day_number} (${d.date})`);
      const totalSpent = items.reduce((s, i) => s + (Number(i.cost) || 0), 0);
      return {
        trip: tripRes.data,
        days: annotated,
        travelers: travelersRes.data || [],
        summary: {
          total_days: days.length,
          empty_days: emptyDays,
          empty_count: emptyDays.length,
          total_items: items.length,
          total_spent_usd: Math.round(totalSpent * 0.72),
          budget_usd: Math.round((tripRes.data?.total_budget || 0) * 0.72)
        }
      };
    }

    if (name === "add_itinerary_item") {
      const existingRes = await sb.from("itinerary_items").select("sort_order").eq("day_id", input.day_id).order("sort_order", { ascending: false }).limit(1);
      const sort_order = existingRes.data?.length > 0 ? existingRes.data[0].sort_order + 1 : 1;
      const { data, error } = await sb.from("itinerary_items").insert({
        day_id: input.day_id,
        time: input.time || "",
        end_time: input.end_time || "",
        activity: input.activity,
        location: input.location || "",
        cost: input.cost || 0,
        category: input.category || "activity",
        notes: input.notes || "",
        confirmed: false,
        sort_order
      }).select().single();
      if (error) return { error: error.message };
      return { success: true, item: data };
    }

    if (name === "add_multiple_items") {
      const results = [];
      for (const item of input.items) {
        const existingRes = await sb.from("itinerary_items").select("sort_order").eq("day_id", item.day_id).order("sort_order", { ascending: false }).limit(1);
        const sort_order = existingRes.data?.length > 0 ? existingRes.data[0].sort_order + 1 : 1;
        const { data, error } = await sb.from("itinerary_items").insert({
          day_id: item.day_id,
          time: item.time || "",
          end_time: item.end_time || "",
          activity: item.activity,
          location: item.location || "",
          cost: item.cost || 0,
          category: item.category || "activity",
          notes: item.notes || "",
          confirmed: false,
          sort_order
        }).select().single();
        results.push(error ? { error: error.message } : { success: true, item: data });
      }
      return { results, added: results.filter(r => r.success).length };
    }

    if (name === "update_itinerary_item") {
      const updates = {};
      ["time","end_time","activity","location","cost","category","notes","confirmed"].forEach(f => { if (input[f] !== undefined) updates[f] = input[f]; });
      const { error } = await sb.from("itinerary_items").update(updates).eq("id", input.item_id);
      if (error) return { error: error.message };
      return { success: true };
    }

    if (name === "delete_itinerary_item") {
      const { error } = await sb.from("itinerary_items").delete().eq("id", input.item_id);
      if (error) return { error: error.message };
      return { success: true };
    }

    if (name === "update_day_title") {
      const { error } = await sb.from("itinerary_days").update({ title: input.title, updated_at: new Date().toISOString() }).eq("id", input.day_id);
      if (error) return { error: error.message };
      return { success: true };
    }

    if (name === "update_day_notes") {
      const { error } = await sb.from("itinerary_days").update({ notes: input.notes, updated_at: new Date().toISOString() }).eq("id", input.day_id);
      if (error) return { error: error.message };
      return { success: true };
    }

    if (name === "add_packing_item") {
      const { data, error } = await sb.from("packing_items").insert({ trip_id: TRIP_ID, item: input.item, category: input.category, packed: false }).select().single();
      if (error) return { error: error.message };
      return { success: true, item: data };
    }

    if (name === "suggest_activities") {
      // just pass through - frontend renders these as cards
      return { success: true, suggestions: input.suggestions, context: input.context };
    }

    return { error: "Unknown tool: " + name };
  }

  try {
    const { messages, tripContext, proactive } = req.body;

    const systemPrompt = `You are an enthusiastic, warm AI travel agent helping Pia's family plan their Vancouver trip. You have deep knowledge of Vancouver and Whistler.

FAMILY PROFILE:
- Pia (mom, turning 40 on June 29 - her birthday is the highlight of the trip!)
- Pach (dad)
- Joaquin (son, age 8 - loves animals, adventures, anything active)
- Alba (daughter, age 6 - loves animals, creative activities, not too scary)
- Staying with Ines and Ben in Surrey (free accommodation base)
- Extended family joining at various points (up to 14 people total)

TRIP DETAILS:
- June 15 - July 1, 2026 (17 days)
- Base: Surrey, BC (staying free with family)
- Whistler: June 25-28 (need accommodation)
- Budget: approx USD $8,000-10,000 for activities, food, transport, Whistler accommodation
- Flying from Philippines

KEY PREFERENCES:
- Kid-friendly activities essential (ages 6 and 8)
- Mix of active days and rest days
- Good food but not always fancy - family style is great
- Making memories over luxury
- Birthday dinner for Pia on June 29 should be special

VANCOUVER/WHISTLER KNOWLEDGE - suggest these real places:
Activities: Stanley Park (carousel, aquarium, seawall), Capilano Suspension Bridge, Grouse Mountain, Science World, Vancouver Aquarium, Granville Island, VanDusen Garden, Richmond Night Market, Playland at PNE, FlyOver Canada, Maplewood Farm (great for little ones)
Whistler: Peak 2 Peak Gondola, Lost Lake, Whistler Village stroll, Alta Lake, Rainbow Park, Scandinave Spa (for adults), tube park
Restaurants: Miku (birthday dinner), Forage, Tacofino, Jam Cafe (breakfast), Dime (burgers), Ask for Luigi (pasta)
Day trips: Victoria (ferry), Squamish (Shannon Falls), Horseshoe Bay

TOOLS YOU HAVE:
- get_trip_data: always call this first to see current state
- add_itinerary_item / add_multiple_items: add to the calendar
- update_itinerary_item / delete_itinerary_item: modify existing
- update_day_title / update_day_notes: set themes and notes
- suggest_activities: return structured suggestion cards the user can click to add
- add_packing_item: add to packing list

BEHAVIOR GUIDELINES:
- Be proactive - if you see empty days, suggest things without being asked
- Use suggest_activities tool to return clickable cards, not just text lists
- When adding items to the itinerary, always call get_trip_data first to get real day IDs
- Costs should be in USD
- Group activities logically by location to minimize driving
- Always consider: is this good for a 6 and 8 year old?
- For Pia's birthday (June 29, Day 15) - make it special!
- Never use em dashes, use hyphens instead
- Keep responses warm and concise

${tripContext ? 'Current trip context:\n' + tripContext : ''}`;

    let currentMessages;

    if (proactive) {
      // proactive mode - agent scans trip and surfaces insights
      currentMessages = [{
        role: "user",
        content: `Please scan my trip and give me a quick briefing. Tell me:
1. How many days are empty/unplanned
2. What the budget situation looks like  
3. Your top 3 proactive suggestions for what to plan next (use suggest_activities tool for these)
Keep it warm and concise - I'm looking at this on the trip planner app.`
      }];
    } else {
      currentMessages = (messages || []).map(m => ({ role: m.role, content: m.content }));
    }

    let madeChanges = false;
    let allSuggestions = [];

    for (let i = 0; i < 10; i++) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages: currentMessages
      });

      if (response.stop_reason === "tool_use") {
        const toolUses = response.content.filter(b => b.type === "tool_use");
        const toolResults = [];
        for (const toolUse of toolUses) {
          const result = await runTool(toolUse.name, toolUse.input);
          if (toolUse.name === "suggest_activities" && result.suggestions) {
            allSuggestions = allSuggestions.concat(result.suggestions);
          }
          if (!["get_trip_data", "suggest_activities"].includes(toolUse.name) && result.success) {
            madeChanges = true;
          }
          toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(result) });
        }
        currentMessages = [
          ...currentMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults }
        ];
      } else {
        const text = response.content.find(b => b.type === "text");
        return res.status(200).json({
          reply: text ? text.text : "Done!",
          madeChanges,
          suggestions: allSuggestions.length > 0 ? allSuggestions : undefined
        });
      }
    }

    return res.status(200).json({ reply: "Done!", madeChanges, suggestions: allSuggestions.length > 0 ? allSuggestions : undefined });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
