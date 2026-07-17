type CircularProgressProps = {
  value: number;
};

export default function CircularProgress({
  value,
}: CircularProgressProps) {
  const radius = 70;
  const stroke = 10;

  const normalizedRadius = radius - stroke * 0.5;

  const circumference = normalizedRadius * 2 * Math.PI;

  const strokeDashoffset =
    circumference - (value / 100) * circumference;

  return (
    <div className="flex justify-center items-center">

      <svg
        height={radius * 2}
        width={radius * 2}
      >
        <circle
          stroke="#2B2B2B"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        <circle
          stroke="#D4AF37"
          fill="transparent"
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{
            strokeDashoffset,
            transition: "stroke-dashoffset .6s ease",
          }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />

        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="white"
          fontSize="28"
          fontWeight="700"
        >
          {value}%
        </text>

      </svg>

    </div>
  );
}