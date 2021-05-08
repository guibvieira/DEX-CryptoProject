pragma solidity >=0.6.0 <=0.8.0;
pragma abicoder v2;
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./Wallet.sol";

contract DEX is Wallet {
    using SafeMath for uint256;

    enum Side {
        BUY,
        SELL
    }
    
    struct Order{
        uint id;
        address trader;
        Side side;
        bytes32 ticker;
        uint amount;
        uint price;
    }

    mapping( bytes32 => mapping(uint => Order[])) public orderBook;
    uint public nextOrderId = 0;

    function getOrderBook(bytes32 ticker, Side side) view public returns(Order[] memory){
        return orderBook[ticker][uint(side)];
    }

    function createLimitOrder(Side side, bytes32 ticker, uint amount, uint price) public {
        if(side == Side.BUY){
            require(balances[msg.sender]["ETH"] >= amount.mul(price));
        } else if (side == Side.SELL){
            require(balances[msg.sender][ticker] >= amount);
        }

        Order[] storage order = orderBook[ticker][uint(side)];

        order.push(Order(nextOrderId,msg.sender, side, ticker, amount, price));
        
        // if(side == Side.BUY){
        //     Order memory tempOrder;
        //     for(uint i=order.length-1; i=1; i--){
        //         if (order[i].price >= order[i-1].price){
        //             tempOrder = order[i-1];
        //             order[i-1] = order[i];
        //             order[i] = tempOrder;
        //         }
        //     }
        // } else if (side == Side.SELL){
        //     Order memory tempOrder;
        //     for(uint i=order.length-1; i=1; i--){
        //         if (order[i].price <= order[i-1].price){
        //             tempOrder = order[i-1];
        //             order[i-1] = order[i];
        //             order[i] = tempOrder;
        //         }
        //     }
        // }

        uint i = order.length > 0 ? order.length - 1 : 0;

        //Bubble sort
        if(side == Side.BUY){
            Order memory tempOrder;
            while (i>0){
                if (order[i-1].price > order[i].price){
                    break;
                }
                    tempOrder = order[i-1];
                    order[i-1] = order[i];
                    order[i] = tempOrder;
                    i--;
            }
        } else if (side == Side.SELL){
            Order memory tempOrder;
            while (i>0){
                if (order[i-1].price < order[i].price){
                    break;
                }
                    tempOrder = order[i-1];
                    order[i-1] = order[i];
                    order[i] = tempOrder;
                    i--;
            }
        }
        nextOrderId++;

    }
}