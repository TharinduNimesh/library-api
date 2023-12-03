import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/dashboard", async (req, res) => {
  const books = await prisma.holding.findMany({
    include: {
      Issue: {
        include: {
          Author: true,
        },
      },
      Removed_Holding: true,
      Reservation: true,
    },
  });

  const removed = books.filter((book) => {
    if (book.is_removed) {
      const year = new Date(book.Removed_Holding[0].removed_at).getFullYear();
      if (year === new Date().getFullYear()) {
        return book;
      }
    }
  });

  const available = books.filter((book) => {
    if (!book.is_removed) {
      let is_available = true;
      book.Reservation.map((reservation) => {
        if (reservation.is_received == 0) {
          is_available = false;
        }
      });
      if (is_available) {
        return book;
      }
    }
  });

  const reservations = await prisma.reservation.findMany({
    where: {
      is_received: 0,
    },
    include: {
      Members: true,
      Holding: {
        include: {
          Issue: {
            include: {
              Author: true,
            },
          },
        },
      },
    },
    orderBy: {
      reserved_at: "desc",
    },
  });

  let issues = await prisma.issue.findMany({
    include: {
      Author: true,
      Holding: {
        include: {
          Reservation: true,
        },
      },
    },
  });

  issues = issues.map((issue) => {
    let count = 0;
    issue.Holding.map((holding) => {
      if (holding.Reservation.length > 0) {
        count += holding.Reservation.length;
      }
    });

    return {
      title: issue.title,
      author: issue.Author.name,
      copies: issue.Holding.length,
      count,
    };
  });

  let popular = issues.sort((a, b) => b.count - a.count);
  popular = popular.slice(0, 5);

  res.json({
    all: books.length,
    removed: removed.length,
    available: available.length,
    reservations,
    popular,
  });
});

router.get("/deploy", async (req, res) => {
  const position = await prisma.role.findFirst();

  if (!position) {
    await prisma.role.createMany({
      data: [
        {
          name: "Librarian",
        },
        {
          name: "Developer",
        },
      ],
    });
  }

  const roles = await prisma.staff_Roles.findFirst();
  if(!roles) {
    await prisma.staff_Roles.createMany({
      data: staff_roles
    })
  }

  const user_tables = await prisma.user_Table.findFirst();
  if(!user_tables) {
    await prisma.user_Table.createMany({
      data: [
        {
          name: "student",
        },
        {
          name: "teacher",
        },
        {
          name: "staff",
        }
      ],
    });
  }

  res.send("Deployed successfully");
});

export default router;

const staff_roles = [
  {
    name: "Administrative Staff",
  },
  {
    name: "Clerical Staff",
  },
  {
    name: "Finance and Accounting",
  },
  {
    name: "Human Resources",
  },
  {
    name: "Facilities and Maintenance",
  },
  {
    name: "IT and Technical Support",
  },
  {
    name: "Security",
  },
  {
    name: "Transportation",
  },
  {
    name: "Health and Wellness",
  },
  {
    name: "Cafeteria Staff",
  },
  {
    name: "Librarians and Library Assistants",
  },
  {
    name: "Student Support Services",
  },
  {
    name: "Public Relations and Communication",
  },
  {
    name: "Event Planning and Coordination",
  },
  {
    name: "Sports and Recreation",
  },
  {
    name: "Arts and Culture",
  },
  {
    name: "Community Engagement",
  },
  {
    name: "Special Education Assistants",
  },
  {
    name: "Technology Integration Specialists",
  },
  {
    name: "Registrar",
  },
];