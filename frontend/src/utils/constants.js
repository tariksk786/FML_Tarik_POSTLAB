import React from 'react';
import { Truck, Bus, Car, ShieldAlert, Sparkles, Sliders, Database, Cpu, BookOpen } from 'lucide-react';

export const FEATURE_GROUPS = [
  {
    name: "Shape & Circularity",
    features: [
      { key: "Comp", label: "Compactness", desc: "(perimeter)² / area" },
      { key: "Circ", label: "Circularity", desc: "(radius)² / area" },
      { key: "D.Circ", label: "Distance Circularity", desc: "area / (av. distance from border)²" },
      { key: "Rad.Ra", label: "Radius Ratio", desc: "(max.rad - min.rad) / av.radius" },
    ]
  },
  {
    name: "Aspect Ratios & Dimensions",
    features: [
      { key: "Pr.Axis.Ra", label: "Principal Axis Aspect Ratio", desc: "(minor axis) / (major axis)" },
      { key: "Max.L.Ra", label: "Max Length Aspect Ratio", desc: "(length perp. max length) / (max length)" },
      { key: "Scat.Ra", label: "Scatter Ratio", desc: "(inertia about minor) / (inertia about major)" },
      { key: "Elong", label: "Elongatedness", desc: "area / (shrink width)²" },
    ]
  },
  {
    name: "Rectangularity & Moments",
    features: [
      { key: "Pr.Axis.Rect", label: "Principal Axis Rectangularity", desc: "area / (pr.axis length × pr.axis width)" },
      { key: "Max.L.Rect", label: "Max Length Rectangularity", desc: "area / (max.length × length perp.)" },
      { key: "Sc.Var.Maxis", label: "Scaled Variance Along Major Axis", desc: "2nd moment about minor axis / area" },
      { key: "Sc.Var.maxis", label: "Scaled Variance Along Minor Axis", desc: "2nd moment about major axis / area" },
      { key: "Ra.Gyr", label: "Scaled Radius of Gyration", desc: "(mavar + mivar) / area" },
    ]
  },
  {
    name: "Skewness, Kurtosis & Hollows",
    features: [
      { key: "Skew.Maxis", label: "Skewness About Major Axis", desc: "3rd moment about major / sigma_min³" },
      { key: "Skew.maxis", label: "Skewness About Minor Axis", desc: "3rd moment about minor / sigma_maj³" },
      { key: "Kurt.maxis", label: "Kurtosis About Minor Axis", desc: "4th moment about major / sigma_min⁴" },
      { key: "Kurt.Maxis", label: "Kurtosis About Major Axis", desc: "4th moment about minor / sigma_maj⁴" },
      { key: "Holl.Ra", label: "Hollows Ratio", desc: "area of hollows / area of bounding polygon" },
    ]
  }
];

export const CLASS_CONFIG = {
  bus: {
    label: "Bus",
    color: "#4F46E5", // Indigo
    bgLight: "bg-indigo-50",
    textClass: "text-indigo-600",
    borderClass: "border-indigo-200",
    badgeClass: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: Bus,
    description: "Large commercial passenger transport with rectangular silhouette and high compactness."
  },
  van: {
    label: "Van",
    color: "#0F766E", // Teal
    bgLight: "bg-teal-50",
    textClass: "text-teal-700",
    borderClass: "border-teal-200",
    badgeClass: "bg-teal-100 text-teal-800 border-teal-200",
    icon: Truck,
    description: "Utility box-shaped passenger/cargo vehicle with moderate elongation and high rectangularity."
  },
  saab: {
    label: "Saab Car",
    color: "#D97706", // Amber
    bgLight: "bg-amber-50",
    textClass: "text-amber-700",
    borderClass: "border-amber-200",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    icon: Car,
    description: "Saab 9000 sedan silhouette featuring aerodynamic sloping roofline and distinct aspect ratios."
  },
  opel: {
    label: "Opel Car",
    color: "#DC2626", // Red / Coral
    bgLight: "bg-red-50",
    textClass: "text-red-700",
    borderClass: "border-red-200",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    icon: Car,
    description: "Opel Manta 400 compact coupe silhouette exhibiting sharp profile and compact inertia."
  }
};
