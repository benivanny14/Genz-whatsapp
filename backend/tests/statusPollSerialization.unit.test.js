const mongoose = require("mongoose");
const Status = require("../models/Status");

const baseStatus = () => ({
  userId: new mongoose.Types.ObjectId(),
  type: "text",
  content: "hello",
});

describe("Status poll serialization", () => {
  test("omits poll for statuses that never had one", () => {
    const status = new Status(baseStatus());

    expect(status.toObject()).not.toHaveProperty("poll");
    expect(status.toJSON()).not.toHaveProperty("poll");
    expect(JSON.parse(JSON.stringify(status))).not.toHaveProperty("poll");
  });

  test("keeps poll when the status actually has one", () => {
    const status = new Status({
      ...baseStatus(),
      poll: {
        question: "Pick one",
        options: [
          { id: 0, text: "a" },
          { id: 1, text: "b" },
        ],
      },
    });

    const obj = status.toObject();
    expect(obj.poll).toBeDefined();
    expect(obj.poll.question).toBe("Pick one");
    expect(obj.poll.options).toHaveLength(2);
  });
});
