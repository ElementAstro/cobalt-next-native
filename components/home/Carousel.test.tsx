// Carousel.test.tsx
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import { View } from "react-native";
import GalleryCarousel from "./Carousel";

// Mock dependencies
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  return {
    ...Reanimated,
    default: {
      ...Reanimated.default,
      createAnimatedComponent: (component: any) => component,
    },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    useAnimatedScrollHandler: () => ({}),
    withTiming: (toValue: number) => toValue,
  };
});

jest.mock("react-native-toast-message", () => ({
  show: jest.fn(),
}));

jest.mock("react-native-svg", () => ({
  Svg: () => <View />,
  Path: () => <View />,
}));

jest.mock("lucide-react-native", () => ({
  Star: () => <View />,
  Heart: () => <View />,
  Info: () => <View />,
  Bluetooth: () => <View />,
  Camera: () => <View />,
  Bookmark: () => <View />,
}));

const mockItems = [
  {
    image: "https://example.com/image1.jpg",
    ar: 1,
    title: "Test Image 1",
    description: "Description 1",
  },
  {
    image: "https://example.com/image2.jpg",
    ar: 1,
    title: "Test Image 2",
    description: "Description 2",
  },
];

describe("GalleryCarousel", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("renders correctly with default props", () => {
    const { getByText, getAllByText } = render(
      <GalleryCarousel items={mockItems} />
    );

    expect(getByText("Test Image 1")).toBeTruthy();
    expect(getByText("Test Image 2")).toBeTruthy();
    expect(getAllByText(/Description/).length).toBe(2);
  });

  /*


  it("renders with custom height", () => {
    const { container } = render(
      <GalleryCarousel items={mockItems} height={400} />
    );
    expect(container).toBeTruthy();
  });
  */

  it("handles autoplay functionality", () => {
    const { getByText } = render(<GalleryCarousel items={mockItems} />);

    // Fast-forward through autoplay interval
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(getByText("Test Image 2")).toBeTruthy();
  });

  it("disables previous button on first slide", () => {
    const { getByTestId } = render(<GalleryCarousel items={mockItems} />);
    const prevButton = getByTestId("prev-button");

    expect(prevButton.props.disabled).toBe(true);
  });

  it("disables next button on last slide", async () => {
    const { getByTestId } = render(<GalleryCarousel items={mockItems} />);
    const nextButton = getByTestId("next-button");

    // Navigate to last slide
    fireEvent.press(nextButton);

    expect(nextButton.props.disabled).toBe(true);
  });

  it("handles navigation between slides", () => {
    const { getByTestId } = render(<GalleryCarousel items={mockItems} />);
    const nextButton = getByTestId("next-button");
    const prevButton = getByTestId("prev-button");

    fireEvent.press(nextButton);
    expect(getByTestId("carousel-item-1")).toBeTruthy();

    fireEvent.press(prevButton);
    expect(getByTestId("carousel-item-0")).toBeTruthy();
  });

  it("updates pagination indicators", () => {
    const { getAllByTestId } = render(<GalleryCarousel items={mockItems} />);
    const indicators = getAllByTestId("pagination-dot");

    expect(indicators[0].props.className).toContain("bg-black");
    expect(indicators[1].props.className).toContain("bg-gray-300");
  });

  it("cleans up autoplay on unmount", () => {
    const { unmount } = render(<GalleryCarousel items={mockItems} />);
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("handles scroll events", () => {
    const { getByTestId } = render(<GalleryCarousel items={mockItems} />);
    const scrollView = getByTestId("carousel-scroll-view");

    fireEvent.scroll(scrollView, {
      nativeEvent: {
        contentOffset: { x: 300, y: 0 },
        contentSize: { height: 200, width: 600 },
        layoutMeasurement: { height: 200, width: 300 },
      },
    });

    expect(getByTestId("carousel-item-1")).toBeTruthy();
  });
});

// Add test IDs to the component before running tests
const testIdProps = {
  "carousel-scroll-view": "carousel-scroll-view",
  "prev-button": "prev-button",
  "next-button": "next-button",
  "pagination-dot": "pagination-dot",
  "carousel-item-": "carousel-item-",
};
