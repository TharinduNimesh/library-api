import express from "express";
import { PrismaClient } from "@prisma/client";
import { check, validationResult } from "express-validator";
import { auth } from "../middleware/auth";
import { refresh } from "../middleware/refresh";

const router = express.Router();
const prisma = new PrismaClient();

const mobileRegex = /^(?:7|0|(?:\+94))[0-9]{9,10}$/;
const roleRegex = /^[1-3]$/;

router.get("/", [auth, refresh], async (req, res) => {
  const students = await prisma.student.findMany();
  const teachers = await prisma.teacher.findMany();
  const staff = await prisma.staff.findMany();

  students.map((student) => {
    student.position = 1;
  });

  teachers.map((teacher) => {
    teacher.position = 2;
  });

  staff.map((staff) => {
    staff.position = 3;
  });

  const members = [...students, ...teachers, ...staff];
  res.json({
    members: members,
    access_token: req.access_token,
  });
});

const validateMember = [
  check("name").isLength({ min: 3 }).withMessage("Name is required"),
  check("mobile").matches(mobileRegex).withMessage("Invalid mobile number"),
  check("position").matches(roleRegex).withMessage("Invalid position"),
  check("index").notEmpty().withMessage("Index is required"),
];

router.post("/new", [auth, refresh, validateMember], async (req, res) => {
  // Validate the request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array(),
    });
  }

  // validate position
  let position = parseInt(req.body.position);

  // Check if member already exists
  const memberExists = await prisma.members.findFirst({
    where: {
      AND: [
        {
          unique_id: req.body.index,
        },
        {
          table_id: position,
        },
      ],
    },
  });
  if (memberExists) {
    return res.status(400).json({
      message: "Member already exists",
    });
  }

  let member;
  if (position === 1) {
    if (req.body.grade === undefined || req.body.grade === null) {
      return res.status(400).json({
        message: "Grade is required for students",
      });
    }

    // Insert student Into Database
    member = await prisma.student.create({
      data: {
        registration_no: req.body.index,
        name: req.body.name,
        grade: req.body.grade.toString(),
        class: req.body.class,
        mobile: req.body.mobile,
        joined_at: new Date(),
      },
    });
  } else if (position == 2) {
    let data = {};

    // Add Common Data
    data.nic = req.body.index;
    data.name = req.body.name;
    data.mobile = req.body.mobile;
    data.joined_at = new Date();

    // add grade and class if available
    if (req.body.grade != undefined || req.body.grade != null) {
      data.grade = req.body.grade.toString();
      data.class = req.body.class;
    }

    member = await prisma.teacher.create({
      data: data,
    });
  } else {
    // Insert Staff Into Database
    member = await prisma.staff.create({
      data: {
        nic: req.body.index,
        name: req.body.name,
        mobile: req.body.mobile,
        joined_at: new Date(),
        roles_id: req.body.role_id,
      },
    });
  }

  // Insert into members table
  await prisma.members.create({
    data: {
      unique_id: req.body.index.toString(),
      table_id: position,
    },
  });

  res.json({
    message: "Member added successfully",
    member: member,
    access_token: req.access_token,
  });
});

router.delete("/ban/:id", [auth, refresh], async (req, res) => {
  // Check if reason is provided
  if (req.body.reason == null) {
    return res.status(400).json({
      message: "Reason is required",
    });
  }

  // Check if member exists
  const member = await prisma.members.findUnique({
    where: {
      id: parseInt(req.params.id),
    },
  });
  if (!member) {
    return res.status(404).json({
      message: "Member not found",
    });
  }

  // Check if member is already removed
  if (member.is_removed) {
    return res.status(400).json({
      message: "Member already removed",
    });
  }

  // Make from members table
  await prisma.members.update({
    where: {
      id: parseInt(req.params.id),
    },
    data: {
      is_removed: 1,
    },
  });

  // Add to removed_members table
  await prisma.removed_Member.create({
    data: {
      member_id: parseInt(req.params.id),
      reason: req.body.reason,
      removed_by: req.user.id,
      removed_at: new Date(),
    },
  });

  res.json({
    message: "Member deleted successfully",
    access_token: req.access_token,
  });
});

export default router;
