import express from "express";
import { PrismaClient } from "@prisma/client";
import { check, validationResult } from "express-validator";
import { auth } from "../middleware/auth";
import { refresh } from "../middleware/refresh";

const prisma = new PrismaClient();
const router = express.Router();

const validateReservation = [
  check("holding_id").notEmpty().withMessage("Invalid Holding ID"),
  check("duration").notEmpty().withMessage("Duration is required"),
  check("position").isInt().withMessage("Invalid position"),
  check("index").notEmpty().withMessage("Index is required"),
];

router.get("/", [auth, refresh], async (req, res) => {
  let reservations = await prisma.reservation.findMany({
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
  });

  const teachers = await prisma.teacher.findMany({});
  const students = await prisma.student.findMany({});
  const staffs = await prisma.staff.findMany({});

  const members = [students, teachers, staffs];

  // return res.send(members);
  reservations = reservations.map((reservation) => {
    const member = members[reservation.Members.table_id - 1].filter(
      (member) => {
        return member.registration_no === reservation.Members.unique_id;
      }
    );

    return {
      id: reservation.id,
      reserver: member[0],
      holding_id: reservation.Holding.serial_no,
      title: reservation.Holding.Issue.title,
      author: reservation.Holding.Issue.Author.name,
      reserved_at: reservation.reserved_at,
      due_date: reservation.due_date,
      role: reservation.Members.table_id,
    };
  });

  return res.status(200).json({
    reservations,
    access_token: req.access_token,
  });
});

router.get("/overdue", [auth, refresh], async (req, res) => {
  const overdue = await prisma.reservation.findMany({
    where: {
      AND: [
        {
          is_received: 0,
        },
        {
          due_date: {
            lte: new Date(),
          },
        },
      ],
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
  });

  const teachers = await prisma.teacher.findMany({});
  const students = await prisma.student.findMany({});
  const staffs = await prisma.staff.findMany({});

  const members = [students, teachers, staffs];

  const overdueReservations = overdue.map((reservation) => {
    const member = members[reservation.Members.table_id - 1].filter(
      (member) => {
        return member.registration_no === reservation.Members.unique_id;
      }
    );

    return {
      id: reservation.id,
      reserver: member[0],
      holding_id: reservation.Holding.serial_no,
      title: reservation.Holding.Issue.title,
      author: reservation.Holding.Issue.Author.name,
      reserved_at: reservation.reserved_at,
      due_date: reservation.due_date,
      role: reservation.Members.table_id,
    };
  });

  return res.json({
    overdueReservations,
    access_token: req.access_token,
  });
});

router.post("/new", [auth, refresh, validateReservation], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array(),
    });
  }

  //   check if member exists
  const member = await prisma.members.findFirst({
    where: {
      table_id: req.body.position,
      unique_id: req.body.index,
    },
  });
  if (!member) {
    return res.status(400).json({
      message: "Member not found",
    });
  }

  //   check if member is removed
  if (member.is_removed) {
    return res.status(400).json({
      message: "Member has been suspended",
    });
  }

  //   check member already has a reservation
  const existingReservation = await prisma.reservation.findFirst({
    where: {
      AND: [
        {
          members_id: member.id,
        },
        {
          is_received: 0,
        },
      ],
    },
  });

  if (existingReservation) {
    return res.status(400).json({
      message: "Member already has a reservation",
    });
  }

  //   check if holding exists
  const holding = await prisma.holding.findFirst({
    where: {
      serial_no: req.body.holding_id,
      is_removed: 0,
    },
  });

  if (!holding) {
    return res.status(400).json({
      message: "Holding not found",
    });
  }

  // calculate due date
  let dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + parseInt(req.body.duration));
  dueDate = dueDate.toISOString();

  // create reservation
  const reservation = await prisma.reservation.create({
    data: {
      members_id: member.id,
      holding_id: holding.id,
      due_date: dueDate,
      reserved_at: new Date(),
    },
  });

  return res.status(200).json({
    message: "Reservation Record Added",
    reservation,
    access_token: req.access_token,
  });
});

router.put("/receive/:id", [auth, refresh], async (req, res) => {
  // check if reservation exists
  const reservation = await prisma.reservation.findFirst({
    where: {
      id: parseInt(req.params.id),
    },
  });

  if (!reservation) {
    return res.status(400).json({
      message: "Reservation not found",
    });
  }

  // update reservation
  const updatedReservation = await prisma.reservation.update({
    where: {
      id: parseInt(req.params.id),
    },
    data: {
      is_received: 1,
      received_at: new Date(),
    },
  });

  return res.status(200).json({
    message: "Reservation Record Updated",
    updatedReservation,
    access_token: req.access_token,
  });
});

export default router;
