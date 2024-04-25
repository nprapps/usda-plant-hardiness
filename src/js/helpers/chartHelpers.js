export function labelConfig(chartWidth,chartHeight,x,y) {
  var length = 40;
  var offset = 10;
  var xSide;
  var ySide;

  if (x > chartWidth/2) {
    xSide = -1;
  } else {
    xSide = 1;
  }

  if (y > chartHeight/2) {
    ySide = 1;
  } else {
    ySide = -1;
  }

  var endX = x + (xSide*offset)
  var endY = y + (ySide*offset) + (ySide*3)

  var arr = [
    {
      "x":endX + (length*xSide),
      "y":endY + (length*ySide)
    },
    {
      "x":endX + 10*xSide*-1+((length/2)*xSide)+(5*xSide),
      "y":endY + ((length/2)*ySide)+(5*ySide)
    },
    {
      "x":endX,
      "y":endY
    }
  ]
  return {
    "arr":arr,
    "xSide":xSide,
    "ySide":ySide,
    "textOffset":{
      "x":endX + (length*xSide),
      "y":endY + (length*ySide)
    }
  }
}
  